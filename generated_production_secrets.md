# 🔐 ChatFlow Generated Production Secrets
> Keep this file secure. It contains all the auto-generated cryptographic keys and passwords that were injected into your `.env` file.

### Backend Authentication & JWT Keys
These keys secure user login sessions. If they are lost, all users will be logged out.
- **JWT_SECRET:** `7e1c35a973e72d0702e3bc38d2aaa6ef45e62f904abb4198f789acd3bf87d7cb`
- **JWT_REFRESH_SECRET:** `244376796fd028c220ccae6d78c3c34bbb13e4cb9b6da71f6ab53cefe2d37f17`

### Web Push Notifications (VAPID Keys)
These keys allow the server to securely send push notifications to browsers.
- **VAPID_PUBLIC_KEY:** `BKXWYRTQ3jYeFqDRiNhwsZOuStqerNGlfdpv-yxwqiWkl05zI7P8TjRIqCZX5SVj95fILuXZ4txkzB1Q1g53wvo`
- **VAPID_PRIVATE_KEY:** `zLFgM_yg5Afw-VJsoAHNn9-QEw4xns2Eo7bL753iDl0`

### Database Credentials
These secure the databases containing user messages, credentials, and state.
- **POSTGRES_PASSWORD:** `966360b08b695c4cee525e1b` *(User: chatflow_user)*
- **MONGO_PASSWORD:** `8b878f70a9003ad63334da26` *(User: chatflow_user)*
- **REDIS_PASSWORD:** `47348644012785dac107b575`

### Infrastructure Secrets
These secure the self-hosted infrastructure tools.
- **MINIO_ROOT_PASSWORD:** `f1489608d06e43831658d7a3` *(User: chatflow_admin)*
- **MEILISEARCH_MASTER_KEY:** `2b22691951bb2c51febd375cbe61f56d08170da5f9d75c2d517851b5e65e7457`
- **GRAFANA_ADMIN_PASSWORD:** `1eeadcac0f8f42a4d037f480`

---
### ⚠️ Still Required (Manual Configuration)
The following secrets could **not** be auto-generated because they require you to create accounts on external services. You must manually replace the `REPLACE_WITH_...` placeholders in your `.env` file for these:
1. `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY`
2. `SMTP_USER` & `SMTP_PASSWORD` (For email notifications and 2FA backup codes)
3. `ANNOUNCED_IP` (Must be set to your exact Server Public IP address for Voice/Video WebRTC)
4. `REACT_APP_API_URL` (Must be set to your public domain name)
