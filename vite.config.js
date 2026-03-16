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
            proxyReq.setHeader('x-fabrix-client', 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjbGllbnRJZCI6IjIyM2M3MGFkLWQwNTctNGQ4MC1iM2U4LTNlMzc3MDdkMWQwYy0xMjc5IiwiY2xpZW50U2VjcmV0IjoiUTNaVUdXdk5lS2tydGxsMDl0eFFmbW1jSGhyakU3ejMiLCJleHAiOjE3NzU2NjAzOTl9.uV3nIF-p-bnOrURAQrqSbT2tLD-V388t8YONAMbEjco');
            
            proxyReq.setHeader('x-openapi-token', 'Bearer eyJ4NXQiOiJNV0l5TkRJNVlqRTJaV1kxT0RNd01XSTNOR1ptTVRZeU5UTTJOVFZoWlRnMU5UTTNaVE5oTldKbVpERTFPVEE0TldFMVlUaGxNak5sTldFellqSXlZUSIsImtpZCI6Ik1XSXlOREk1WWpFMlpXWTFPRE13TVdJM05HWm1NVFl5TlRNMk5UVmhaVGcxTlRNM1pUTmhOV0ptWkRFMU9UQTROV0UxWVRobE1qTmxOV0V6WWpJeVlRX1JTMjU2IiwidHlwIjoiYXQrand0IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiI4NzdhNmMzNS04ZWU5LTQ1MGItODc1MS00N2MzMDUxMzQ5OTUiLCJhdXQiOiJBUFBMSUNBVElPTiIsImF1ZCI6ImlyeHJxb05mbnpvS2h3Z1RfYW5mVk9yWUFXa2EiLCJuYmYiOjE3NzMwNDkzMTMsImF6cCI6ImlyeHJxb05mbnpvS2h3Z1RfYW5mVk9yWUFXa2EiLCJzY29wZSI6ImRlZmF1bHQiLCJpc3MiOiJodHRwczpcL1wvbnNkcy13c28yLmZhYnJpeC1zLnNhbXN1bmdzZHMuY29tOjQ0M1wvb2F1dGgyXC90b2tlbiIsImV4cCI6NDkyODgwOTMxMywiaWF0IjoxNzczMDQ5MzEzLCJqdGkiOiJiOTZkYzNlZC1jYzk4LTRhOWQtODE1MC04ZmRjMGZkYzRmYTQiLCJjbGllbnRfaWQiOiJpcnhycW9OZm56b0tod2dUX2FuZlZPcllBV2thIn0.pTANdxdRYZrCcil08y9m7AK5_dGGwH1b4wgP40Od3LD0Nq4PrjY2-lth9JDYGBK4Pok1ptTzopWrU-X2jq2yajzqLK_lll3PP3eq3grQHm6h6_3JbWfDXQd2ZIWcixJ2XYFDGHSXDUfXcYN60WmqWIfqTzj84XUvVTekKy_xcjaSjDmH6pPDpYtUDzXNXrOZInBmaln6uxNJoRtlUQmid-QficC0AaOrjU35YO_jJDBQZVcxscGh5E8UYFXxa_Jy1QJWW4vobM-r98EweYx9BnyxySUzAOyQrTFRptVdnf-W4Iu2Aem4hVHJXi6gJ_4HRBnnPGg7r-ANeegVxOKK4g');
          });
        }
      }
    }
  }
})
