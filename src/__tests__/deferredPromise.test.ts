import { describe, it, expect, vi } from 'vitest';
import { DeferredPromise } from '../util/deferredPromise.js';

describe('DeferredPromise', () => {
    it('should resolve correctly', async () => {
        const dp = new DeferredPromise<string>();
        dp.resolve('test');
        await expect(dp).resolves.toBe('test');
        expect(dp.isResolved).toBe(true);
    });

    it('should reject correctly', async () => {
        const dp = new DeferredPromise<string>();
        dp.reject(new Error('fail'));
        await expect(dp).rejects.toThrow('fail');
        expect(dp.isResolved).toBe(true);
    });

    it('should handle then and catch', async () => {
        const dp = new DeferredPromise<number>();
        const spy = vi.fn();
        dp.then(spy);
        dp.resolve(42);
        await dp;
        expect(spy).toHaveBeenCalledWith(42);
    });

    it('should handle finally', async () => {
        const dp = new DeferredPromise<number>();
        const finallySpy = vi.fn();
        const p = dp.finally(finallySpy);
        dp.resolve(123);
        await p;
        expect(finallySpy).toHaveBeenCalled();
    });

    it('should reset properly', async () => {
        const dp = new DeferredPromise<number>();
        dp.resolve(1);
        await dp;
        dp.reset();
        expect(dp.isResolved).toBe(false);
    });

    it('should throw error if resolved twice', async () => {
        const dp = new DeferredPromise<number>();
        dp.resolve(123);
        await dp;
        expect(() => dp.resolve(456)).toThrow('Promise is already resolved or rejected');
    });

    it('should throw error if rejected twice', async () => {
        const dp = new DeferredPromise<number>();
        dp.reject(new Error('first'));
        await expect(dp).rejects.toThrow('first');
        expect(() => dp.reject(new Error('second'))).toThrow('Promise is already resolved or rejected');
    });
});
