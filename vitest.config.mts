import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['src/**/__tests__/**/*.{test,spec}.?(c|m)ts?(x)'],
        exclude: [],
        globals: true,
        reporters: ['vitest-ctrf-json-reporter', 'default'],
        coverage: {
            // you can include other reporters, but 'json-summary' is required, json is recommended
            reporter: ['json-summary', 'json', 'lcov', 'text'],
            reportsDirectory: './coverage',
            // If you want a coverage reports even if your tests are failing, include the reportOnFailure option
            reportOnFailure: true,
        }
    },
})