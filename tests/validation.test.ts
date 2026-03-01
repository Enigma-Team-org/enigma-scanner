import { describe, it, expect } from 'vitest';
import { isUrlSafe } from '@/services/routescan-indexer-service';

describe('isUrlSafe', () => {
  it('allows normal HTTPS URLs', () => {
    expect(isUrlSafe('https://example.com/agent.json')).toBe(true);
    expect(isUrlSafe('https://ipfs.io/ipfs/QmHash')).toBe(true);
    expect(isUrlSafe('https://arweave.net/txid')).toBe(true);
  });

  it('allows HTTP URLs', () => {
    expect(isUrlSafe('http://example.com/metadata')).toBe(true);
  });

  it('blocks localhost', () => {
    expect(isUrlSafe('http://localhost/admin')).toBe(false);
    expect(isUrlSafe('http://127.0.0.1/secrets')).toBe(false);
    expect(isUrlSafe('http://[::1]/admin')).toBe(false);
  });

  it('blocks private networks (10.x.x.x)', () => {
    expect(isUrlSafe('http://10.0.0.1/internal')).toBe(false);
    expect(isUrlSafe('http://10.255.255.255/data')).toBe(false);
  });

  it('blocks private networks (172.16-31.x.x)', () => {
    expect(isUrlSafe('http://172.16.0.1/api')).toBe(false);
    expect(isUrlSafe('http://172.31.255.255/data')).toBe(false);
  });

  it('allows public 172.x addresses', () => {
    expect(isUrlSafe('http://172.15.0.1/api')).toBe(true);
    expect(isUrlSafe('http://172.32.0.1/api')).toBe(true);
  });

  it('blocks private networks (192.168.x.x)', () => {
    expect(isUrlSafe('http://192.168.1.1/router')).toBe(false);
    expect(isUrlSafe('http://192.168.0.100/config')).toBe(false);
  });

  it('blocks link-local (169.254.x.x)', () => {
    expect(isUrlSafe('http://169.254.169.254/latest/meta-data')).toBe(false);
  });

  it('blocks cloud metadata endpoints', () => {
    expect(isUrlSafe('http://metadata.google.internal/computeMetadata')).toBe(false);
  });

  it('blocks .internal domains', () => {
    expect(isUrlSafe('http://service.internal/api')).toBe(false);
  });

  it('blocks non-HTTP protocols', () => {
    expect(isUrlSafe('ftp://files.example.com/data')).toBe(false);
    expect(isUrlSafe('file:///etc/passwd')).toBe(false);
    expect(isUrlSafe('javascript:alert(1)')).toBe(false);
  });

  it('blocks invalid URLs', () => {
    expect(isUrlSafe('not-a-url')).toBe(false);
    expect(isUrlSafe('')).toBe(false);
  });

  it('blocks 0.x.x.x addresses', () => {
    expect(isUrlSafe('http://0.0.0.0/admin')).toBe(false);
  });
});
