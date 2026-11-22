# PaisaWin Integration Guide

How PaisaWin (or any partner site) reports successful registrations to Ads2Pub.
Conversions are visible **only in the Admin Panel** (Admin → Conversions); publishers
never see conversion counts or details.

## 1. Tracking flow

1. A publisher shares their tracking link: `https://<ads2pub-domain>/t/<code>`.
2. Ads2Pub records the click and redirects the visitor to the landing page with two
   query parameters appended:

   ```
   https://paisawin.online/register?ref=<code>&click_id=<click_id>
   ```

3. **PaisaWin must store `ref` and `click_id`** (e.g. in the session or on the pending
   user record) and keep them through the whole registration journey.
4. **Only after the registration has fully succeeded**, PaisaWin's server calls the
   postback endpoint below — once per registered user. Do not call it on page visits,
   OTP sends, failed or abandoned registrations.

## 2. Postback endpoint

```http
POST https://<ads2pub-domain>/api/postback
Content-Type: application/json
```

| Field      | Required | Description |
|------------|----------|-------------|
| `code`     | yes      | The `ref` value received on the landing URL. |
| `uid`      | yes      | PaisaWin's unique registration reference (user ID). **One `uid` is counted once, ever** — retries are safe. Max 191 chars. |
| `secret`   | yes      | Shared postback secret (Admin → Settings → Postback API Secret Token). Server-to-server only — never expose it in browser code. |
| `click_id` | recommended | The `click_id` received on the landing URL. Stored on the conversion for attribution. If sent, it must belong to the same link or the event is rejected. |
| `status`   | optional | Omit for a successful registration. If sent, it must be one of `success`, `completed`, `registered`, `approved`, `confirmed`, `ok`, `1`, `true`; anything else (`failed`, `pending`, …) is logged and **not** counted. |
| `type`     | optional | `publisher` or `traffic`. Auto-detected from `code` when omitted. |

Example:

```bash
curl -X POST https://<ads2pub-domain>/api/postback \
  -H "Content-Type: application/json" \
  -d '{"code":"A1B2C3D4E5","uid":"PW-987654","click_id":"Xk3...","secret":"<postback-secret>"}'
```

### GET alternative

For panels that can only fire a URL:

```http
GET https://<ads2pub-domain>/api/postback?code=A1B2C3D4E5&uid=PW-987654&click_id=Xk3...&secret=<postback-secret>
```

Aliases: `code` (`ref`, `ref_code`, `subid`, `sub_id`), `uid` (`user_id`, `userid`,
`external_user_id`), `click_id` (`clickid`), `secret` (`key`). Form-encoded POST bodies
are accepted too. Prefer POST: GET URLs (including the secret) end up in access logs.

## 3. Responses

| HTTP | Body | Meaning | Retry? |
|------|------|---------|--------|
| 200 | `{"success":true,"credited":0.05}` | Conversion recorded. | No |
| 200 | `{"success":false,"reason":"duplicate"}` | This `uid` was already counted. | No |
| 200 | `{"success":false,"reason":"Invalid secret"}` | Wrong / missing secret. | No — fix config |
| 200 | `{"success":false,"reason":"link not found"}` | Unknown `code`. | No |
| 200 | `{"success":false,"reason":"click_id belongs to a different link"}` | Attribution mismatch — left for admin review. | No |
| 200 | `{"success":false,"reason":"registration not successful (status=…)"}` | Non-success `status`. | No |
| 500 | `{"success":false,"reason":"Internal server error"}` | Temporary failure on our side. | **Yes**, with backoff — retries can never double count. |

## 4. Security

- In production the secret must be configured in Admin → Settings. The development
  defaults (`your-postback-secret-key-for-dev`, `pw_secret_changeme`) are published in
  this repository and are **always rejected in production**.
- Secrets are compared in constant time; stray whitespace is ignored.
- Every callback — credited, duplicate or rejected — is written to an audit log
  (`ConversionEvent` table). Rejected callbacks are listed in Admin → Conversions →
  Rejected callbacks, and the latest 25 in Admin → Settings.

## 5. Troubleshooting

Check Admin → Conversions → Rejected callbacks first; each row shows the reason, the
code/uid/click_id received, and a masked preview of the secret that was sent.

- `Invalid secret` — the secret PaisaWin sends differs from Admin → Settings, or the
  setting still holds a public default.
- `link not found` — PaisaWin is not sending back the exact `ref` value from the landing URL.
- `duplicate` — expected on retries; the first callback for that `uid` was already counted.
- Nothing listed at all — PaisaWin is not calling `/api/postback`.
