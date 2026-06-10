# Webhook Signature Verification

StreamPay secures webhook deliveries by signing the payload with a secret key unique to each subscription. This ensures that the webhook requests received by your server actually originated from StreamPay and have not been tampered with.

Every webhook request includes the `X-StreamPay-Signature` header, which contains the signature formatted as:
```http
X-StreamPay-Signature: sha256=computed_hmac_hex_value
```

---

## Verification Workflow

To verify a webhook request:

1. **Extract the Signature**: Retrieve the value of the `X-StreamPay-Signature` header.
2. **Retrieve the Secret**: Obtain the secret key associated with the webhook subscription.
3. **Compute the HMAC**: Calculate the HMAC-SHA256 hash using the raw request body as the message and the subscription secret as the key.
4. **Compare Securely**: Perform a constant-time comparison between the received signature (excluding the `sha256=` prefix) and your computed HMAC hex string. This protects against timing attacks.

---

## Code Examples

### Node.js (Express)

In Node.js, you must use the raw request body buffer to calculate the signature.

```javascript
import crypto from 'crypto';

// Express middleware or route handler
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signatureHeader = req.headers['x-streampay-signature'];
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return res.status(401).send('Missing or invalid signature header');
  }

  const receivedSignature = signatureHeader.substring(7); // Remove 'sha256=' prefix
  const webhookSecret = process.env.WEBHOOK_SECRET; // Retrieve your subscription secret

  // Compute the expected HMAC using the raw request body buffer
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(req.body);
  const expectedSignature = hmac.digest('hex');

  // Compare securely using constant-time comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(receivedSignature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  );

  if (!isValid) {
    return res.status(403).send('Invalid signature');
  }

  // Parse payload and process the webhook event
  const payload = JSON.parse(req.body.toString('utf8'));
  console.log('Verified Webhook Event:', payload);

  res.status(200).send('OK');
});
```

---

### Python (Flask & FastAPI)

#### Flask Example
```python
import hmac
import hashlib
from flask import Flask, request, abort

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature_header = request.headers.get('X-StreamPay-Signature')
    if not signature_header or not signature_header.startswith('sha256='):
        abort(401, 'Missing or invalid signature header')

    received_sig = signature_header[7:]  # Remove 'sha256='
    webhook_secret = b"your_subscription_secret"

    # Compute expected signature
    raw_body = request.get_data()
    expected_sig = hmac.new(
        webhook_secret,
        msg=raw_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    # Secure comparison
    if not hmac.compare_digest(received_sig, expected_sig):
        abort(403, 'Invalid signature')

    # Parse and handle event
    payload = request.get_json()
    print("Verified Event:", payload)
    return "OK", 200
```

#### FastAPI Example
```python
import hmac
import hashlib
from fastapi import FastAPI, Header, Request, HTTPException

app = FastAPI()

@app.post("/webhook")
async def webhook(request: Request, x_streampay_signature: str = Header(None)):
    if not x_streampay_signature or not x_streampay_signature.startswith("sha256="):
        raise HTTPException(status_code=401, detail="Missing or invalid signature header")

    received_sig = x_streampay_signature[7:]
    webhook_secret = b"your_subscription_secret"

    raw_body = await request.body()
    expected_sig = hmac.new(
        webhook_secret,
        msg=raw_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(received_sig, expected_sig):
        raise HTTPException(status_code=403, detail="Invalid signature")

    payload = await request.json()
    print("Verified Event:", payload)
    return {"status": "ok"}
```

---

### Rust (Actix-web)

In Rust, you can use the `ring` or `hmac`/`sha2` crates for computation.

```rust
use actix_web::{post, web, HttpRequest, HttpResponse, Responder};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use hex;

type HmacSha256 = Hmac<Sha256>;

#[post("/webhook")]
async fn handle_webhook(
    req: HttpRequest,
    body: web::Bytes,
) -> impl Responder {
    let signature_header = match req.headers().get("X-StreamPay-Signature") {
        Some(val) => match val.to_str() {
            Ok(s) if s.starts_with("sha256=") => &s[7..],
            _ => return HttpResponse::Unauthorized().body("Invalid signature header"),
        },
        None => return HttpResponse::Unauthorized().body("Missing signature header"),
    };

    let secret = "your_subscription_secret";

    // Compute expected HMAC
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(&body);
    let result = mac.finalize();
    let expected_signature = hex::encode(result.into_bytes());

    // Secure constant-time comparison
    let is_valid = ring::constant_time::verify_slices_are_equal(
        signature_header.as_bytes(),
        expected_signature.as_bytes()
    ).is_ok();

    if !is_valid {
        return HttpResponse::Forbidden().body("Invalid signature");
    }

    // Parse and handle body
    let payload: serde_json::Value = match serde_json::from_slice(&body) {
        Ok(json) => json,
        Err(_) => return HttpResponse::BadRequest().body("Invalid JSON"),
    };

    println!("Verified Webhook Event: {:?}", payload);
    HttpResponse::Ok().body("OK")
}
```
