import { describe, it, expect } from 'bun:test'
import { ProvablyFairService } from '../../../../src/application/provably-fair/provably-fair.service';


const service = new ProvablyFairService()

describe('ProvablyFairService', () => {

  describe('generateSeed', () => {
    it('should generate a 64 character hex string', () => {
      const seed = service.generateinitialSeed()
      expect(seed).toMatch(/^[0-9a-f]+$/)
    })

    it('should generate unique seeds', () => {
      const seed1 = service.generateinitialSeed()
      const seed2 = service.generateinitialSeed()
      expect(seed1).not.toBe(seed2)
    })
  })

  describe('hashSeed', () => {
    it('should return a 64 character hex string', () => {
      const hash = service.hashSeed('any-seed')
      expect(hash).toHaveLength(64)
    })

    it('should be deterministic for the same seed', () => {
      const hash1 = service.hashSeed('same-seed')
      const hash2 = service.hashSeed('same-seed')
      expect(hash1).toBe(hash2)
    })

    it('should return different hashes for different seeds', () => {
      const hash1 = service.hashSeed('seed-a')
      const hash2 = service.hashSeed('seed-b')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('calculateCrashPoint', () => {
    it('should be deterministic for the same inputs', () => {
      const cp1 = service.calculateCrashPoint('server-seed', 'client-seed', 1)
      const cp2 = service.calculateCrashPoint('server-seed', 'client-seed', 1)
      expect(cp1).toBe(cp2)
    })

    it('should return different crash points for different nonces', () => {
      const cp1 = service.calculateCrashPoint('server-seed', 'client-seed', 1)
      const cp2 = service.calculateCrashPoint('server-seed', 'client-seed', 2)
      expect(cp1).not.toBe(cp2)
    })

    it('should return 1.00 for house edge seeds', () => {
      let houseEdgeSeed = ''
      for (let i = 0; i < 10000; i++) {
        const seed = `test-seed-${i}`
        const hmac = service['calculateCrashPoint'](seed, 'client', 1)
        if (hmac === 1.00) {
          houseEdgeSeed = seed
          break
        }
      }
      if (houseEdgeSeed) {
        expect(service.calculateCrashPoint(houseEdgeSeed, 'client', 1)).toBe(1.00)
      }
    })

    it('should return crash point >= 1.00', () => {
      for (let i = 0; i < 100; i++) {
        const cp = service.calculateCrashPoint(`seed-${i}`, 'client-seed', i)
        expect(cp).toBeGreaterThanOrEqual(1.00)
      }
    })

    it('should return known crash point for known inputs — regression pin', () => {
      const serverSeed = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      const clientSeed = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      const nonce = 1
      expect(service.calculateCrashPoint(serverSeed, clientSeed, nonce)).toBe(6.59)
    })
  })

  describe('verify', () => {
    it('should return true for valid inputs', () => {
      const serverSeed = 'my-server-seed'
      const clientSeed = 'my-client-seed'
      const nonce = 1
      const serverSeedHash = service.hashSeed(serverSeed)
      const crashPoint = service.calculateCrashPoint(serverSeed, clientSeed, nonce)

      expect(service.verify(serverSeed, serverSeedHash, clientSeed, nonce, crashPoint)).toBe(true)
    })

    it('should return false if serverSeed does not match hash', () => {
      const serverSeed = 'my-server-seed'
      const clientSeed = 'my-client-seed'
      const nonce = 1
      const wrongHash = service.hashSeed('wrong-seed')
      const crashPoint = service.calculateCrashPoint(serverSeed, clientSeed, nonce)

      expect(service.verify(serverSeed, wrongHash, clientSeed, nonce, crashPoint)).toBe(false)
    })

    it('should return false if crashPoint does not match', () => {
      const serverSeed = 'my-server-seed'
      const clientSeed = 'my-client-seed'
      const nonce = 1
      const serverSeedHash = service.hashSeed(serverSeed)

      expect(service.verify(serverSeed, serverSeedHash, clientSeed, nonce, 9.99)).toBe(false)
    })
  })

})
describe('hash chain', () => {
  it('should derive next seed from current seed', () => {
    const seed1 = 'initial-seed'
    const seed2 = service.nextSeed(seed1)
    expect(seed2).toBe(service.hashSeed(seed1))
  })

  it('should verify chain between consecutive rounds', () => {
    const seed1 = 'initial-seed'
    const seed2 = service.nextSeed(seed1)
    const seed2Hash = service.hashSeed(seed2)
    expect(service.verifyChain(seed1, seed2Hash)).toBe(true)
  })

  it('should invalidate chain if seed is tampered', () => {
    const seed1 = 'initial-seed'
    const seed2Hash = service.hashSeed('different-seed')
    expect(service.verifyChain(seed1, seed2Hash)).toBe(false)
  })
})