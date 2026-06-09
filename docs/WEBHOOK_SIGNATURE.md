# Webhook Signature Verification

This document provides guidelines and code examples for validating the authenticity of webhooks delivered by StreamPay.

StreamPay sends an HMAC-SHA256 signature in the `X-StreamPay-Signature` header of each webhook request.

## Verification Workflow

1. Receive the POST request.
2. Read the raw request body.
3. Compute the HMAC-SHA256 signature using the subscription's `secret` and the raw body.
4. Compare the computed signature with the value in `X-StreamPay-Signature`.
