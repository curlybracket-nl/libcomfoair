import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['src/**/__tests__/**/*.{test,spec}.?(c|m)ts?(x)'],
        exclude: [],
        globals: true
    },
})