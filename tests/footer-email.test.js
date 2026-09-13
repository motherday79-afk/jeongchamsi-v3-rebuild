import test from 'node:test';
import assert from 'node:assert/strict';
import { footer } from '../src/layout/site-shell.js';

// A footer email accidentally rendered as a native mail link must fail here.
// Exercise the shared renderer used by both the home and detail pages.
test('all footer contact addresses remain readable and copyable without app-launch links', () => {
  const markup = footer({
    privacyEmail: 'privacy@example.com',
    adEmail: 'ads@example.com',
    customerEmail: 'support@example.com',
    partnerEmail: 'partners@example.com',
    managementEmail: 'office@example.com',
  }, 12);
  const links = [...markup.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map(match => match[1]);
  assert.deepEqual(links, ['#/inquiry', '#/privacy', '#/policy']);
  for (const address of ['privacy@example.com', 'ads@example.com', 'support@example.com', 'partners@example.com', 'office@example.com']) {
    const escaped = address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(markup, new RegExp('<span\\b[^>]*data-allow-copy[^>]*>' + escaped + '</span>'));
  }
});

test('HTML-like contact values remain escaped and do not produce an app link', () => {
  const markup = footer({customerEmail: '<a href="mailto:other@example.com">contact</a>'});
  assert.equal((markup.match(/<a\b/g) || []).length, 3);
  assert.match(markup, /&lt;a href=&quot;mailto:other@example\.com&quot;&gt;contact&lt;\/a&gt;/);
});
