"""Read standard DEX files and select one original class without rewriting its code.

The selected file is BUILD INPUT, never a runtime-loaded asset. Android's D8
merges it with the new application's classes, eliminating unused source tables.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import struct
import zlib
from pathlib import Path

INTRO = 'Lcom/jeongchamsi/preview/IntroView;'
SOURCE_SHA256 = '4f942ccef3f46bcd6f9cad0ae77cfcf0fb99074dde452c6ef0c95497d96ded92'

class Dex:
    def __init__(self, data: bytes):
        self.data = data
        if not data.startswith(b'dex\n') or len(data) < 112:
            raise ValueError('Not a standard DEX file')
        if self.u32(32) != len(data) or self.u32(36) != 112:
            raise ValueError('DEX size/header mismatch')
        if self.u32(40) != 0x12345678:
            raise ValueError('Unsupported DEX byte order')
        if hashlib.sha1(data[32:]).digest() != data[12:32]:
            raise ValueError('DEX signature mismatch')
        if zlib.adler32(data[12:]) & 0xffffffff != self.u32(8):
            raise ValueError('DEX checksum mismatch')
        count, off = self.pair(56)
        self.strings = []
        for i in range(count):
            _, p = self.uleb(self.u32(off + 4*i))
            end = data.index(b'\0', p)
            self.strings.append(data[p:end].decode('utf-8', 'replace'))
        count, off = self.pair(64)
        self.types = [self.strings[self.u32(off + 4*i)] for i in range(count)]
        self.protos = []
        count, off = self.pair(72)
        for i in range(count):
            _, result, p = struct.unpack_from('<III', data, off+12*i)
            args = [] if not p else [self.types[struct.unpack_from('<H', data, p+4+2*j)[0]] for j in range(self.u32(p))]
            self.protos.append('(' + ''.join(args) + ')' + self.types[result])
        self.method_ids = []
        count, off = self.pair(88)
        for i in range(count):
            owner, proto, name = struct.unpack_from('<HHI', data, off+8*i)
            self.method_ids.append((self.types[owner], self.strings[name], self.protos[proto]))
        count, off = self.pair(96)
        self.classes = {}
        for i in range(count):
            entry = struct.unpack_from('<8I', data, off+32*i)
            self.classes[self.types[entry[0]]] = (off+32*i, entry)

    def u32(self, off: int) -> int:
        return struct.unpack_from('<I', self.data, off)[0]

    def pair(self, off: int) -> tuple[int, int]:
        return struct.unpack_from('<II', self.data, off)

    def uleb(self, off: int) -> tuple[int, int]:
        result = 0
        for shift in range(0, 35, 7):
            b = self.data[off]; off += 1
            result |= (b & 127) << shift
            if b < 128:
                return result, off
        raise ValueError('Invalid ULEB128')

    def methods(self, descriptor: str) -> dict:
        p = self.classes[descriptor][1][6]
        counts = []
        for _ in range(4):
            n, p = self.uleb(p); counts.append(n)
        for _ in range(counts[0] + counts[1]):
            _, p = self.uleb(p); _, p = self.uleb(p)
        result = {}
        for count in counts[2:]:
            idx = 0
            for _ in range(count):
                delta, p = self.uleb(p); idx += delta
                flags, p = self.uleb(p)
                code, p = self.uleb(p)
                owner, name, signature = self.method_ids[idx]
                instruction_bytes = b'' if not code else self.data[code+16:code+16+2*self.u32(code+12)]
                result[name+signature] = dict(flags=flags, code_offset=code,
                    instruction_sha256=hashlib.sha256(instruction_bytes).hexdigest(),
                    instruction_bytes=len(instruction_bytes))
        return result


def select_intro(source: bytes) -> bytes:
    if hashlib.sha256(source).hexdigest() != SOURCE_SHA256:
        raise ValueError('This is not the exact APK DEX supplied for this build')
    dex = Dex(source)
    start, _ = dex.classes[INTRO]
    count, off = dex.pair(96)
    output = bytearray(source)
    # Keep the exact class descriptor, fields, annotations, code and static data.
    # Only class definitions are selected. No original MainActivity is retained.
    output[off:off+count*32] = source[start:start+32] + bytes((count-1)*32)
    struct.pack_into('<I', output, 96, 1)
    map_off = dex.u32(52)
    found = False
    for i in range(dex.u32(map_off)):
        entry = map_off + 4 + 12*i
        kind, _, size, item_off = struct.unpack_from('<HHII', output, entry)
        if kind == 0x0006:
            if item_off != off or size != count:
                raise ValueError('Class definition map mismatch')
            struct.pack_into('<I', output, entry+4, 1); found = True
    if not found:
        raise ValueError('Class definition map not found')
    output[12:32] = hashlib.sha1(output[32:]).digest()
    struct.pack_into('<I', output, 8, zlib.adler32(output[12:]) & 0xffffffff)
    selected = Dex(bytes(output))
    if set(selected.classes) != {INTRO} or selected.methods(INTRO) != dex.methods(INTRO):
        raise ValueError('Original intro preservation check failed')
    return bytes(output)


def verify_final(path: Path) -> dict:
    dex = Dex(path.read_bytes())
    names = sorted(dex.classes)
    if INTRO not in names:
        raise ValueError('The original intro is missing')
    for name in names:
        if not name.startswith('Lcom/jeongchamsi/preview/'):
            raise ValueError('Unexpected runtime dependency: ' + name)
        if any(s in name.lower() for s in ('push', 'firebase', 'worker', 'messaging')):
            raise ValueError('Forbidden feature class: ' + name)
    bad_strings = ('Firebase', 'PushRegistration', 'MessagingService',
        'push-register', 'preview-clean.vercel.app', 'JCS_COMPILE_ONLY_STUB')
    for needle in bad_strings:
        if any(needle in value for value in dex.strings):
            raise ValueError('Unexpected leftover in final DEX: ' + needle)
    if len(dex.methods(INTRO)) != 11:
        raise ValueError('Original intro method count changed')
    return dict(class_count=len(names), classes=names, original_intro_present=True,
                no_push_or_firebase=True, compile_only_stub_absent=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('select'); p.add_argument('source', type=Path); p.add_argument('output', type=Path)
    p = sub.add_parser('verify-final'); p.add_argument('dex', type=Path); p.add_argument('report', type=Path)
    args = parser.parse_args()
    if args.command == 'select':
        source = args.source.read_bytes(); selected = select_intro(source)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(selected)
        print('Original IntroView selected; all 11 method instruction sequences unchanged.')
    else:
        report = verify_final(args.dex)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
        print(json.dumps(report, ensure_ascii=False))

if __name__ == '__main__':
    main()
