import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  server: {
    proxy: {
      '/api': {
        target: 'https://nsds-api.fabrix-s.samsungsds.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // Strips /api before sending to Samsung
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // ✅ PASTE YOUR REAL TOKENS HERE
            proxyReq.setHeader('x-fabrix-client', 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjbGllbnRJZCI6IjIyM2M3MGFkLWQwNTctNGQ4MC1iM2U4LTNlMzc3MDdkMWQwYy0xMDI5IiwiY2xpZW50U2VjcmV0IjoiUG1BUW92clI2NkJ3MThhODFSZDVMck9XZXRQbWxkbjciLCJleHAiOjE3NzI3MjI3OTl9.NCQHQWIhiw9azlz4JNGZgsW9llJYEDL3GgyIdxkDdXU');
            
            proxyReq.setHeader('x-openapi-token', 'Bearer eyJ4NXQiOiJNV0l5TkRJNVlqRTJaV1kxT0RNd01XSTNOR1ptTVRZeU5UTTJOVFZoWlRnMU5UTTNaVE5oTldKbVpERTFPVEE0TldFMVlUaGxNak5sTldFellqSXlZUSIsImtpZCI6Ik1XSXlOREk1WWpFMlpXWTFPRE13TVdJM05HWm1NVFl5TlRNMk5UVmhaVGcxTlRNM1pUTmhOV0ptWkRFMU9UQTROV0UxWVRobE1qTmxOV0V6WWpJeVlRX1JTMjU2IiwidHlwIjoiYXQrand0IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiI4NzdhNmMzNS04ZWU5LTQ1MGItODc1MS00N2MzMDUxMzQ5OTUiLCJhdXQiOiJBUFBMSUNBVElPTiIsImF1ZCI6IllVXzZkNGN1Wl9TSVRCc21FT1dGakJkMUZfb2EiLCJuYmYiOjE3NzAzNzcwMTMsImF6cCI6IllVXzZkNGN1Wl9TSVRCc21FT1dGakJkMUZfb2EiLCJzY29wZSI6ImRlZmF1bHQiLCJpc3MiOiJodHRwczpcL1wvbnNkcy13c28yLmZhYnJpeC1zLnNhbXN1bmdzZHMuY29tOjQ0M1wvb2F1dGgyXC90b2tlbiIsImV4cCI6NDkyNjEzNzAxMywiaWF0IjoxNzcwMzc3MDEzLCJqdGkiOiI3YzMyM2ExNi0wZDVjLTQ2OWUtOGM5My0yYjgwZTcxY2YyMjEiLCJjbGllbnRfaWQiOiJZVV82ZDRjdVpfU0lUQnNtRU9XRmpCZDFGX29hIn0.XZy-tWJtMPC1kvWkKYdOJvW4uSYUYTwEGON-Fk4X8eyufIMCoyHgGXU04zQfDt0uddRYJcD4CP1PTUb4pq5pIy9ptqc9mUGZMW8z1HHR8wAN-EZsQ2i23Qtvlu5zMOJ1cY-LQO02kF0sedrBRpYWT-R9V6Zq1b7Nt-zpj7jirf9ChFznk6cLHqyVw9x5EFJrL3lqc-3yFmAeC5lySVkjfUn959w5OBw6uzj7tC9SmWgtxmba5MkqSd-qBj9Fec7ocYXuJz4u8IcXtSgpBCmj8s6S2sRTnopwulOn8VZNhmyX6APhILLc16plwjlSJKVcrbviuYMFavYrHYL0CsSRUA');
            
            proxyReq.setHeader('x-generative-ai-user-email', 'davinder.s1@samsung.com');
          });
        }
      }
    }
  }
})
