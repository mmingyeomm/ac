# AC Deployment Server

A simple server that handles requests containing Solana contract code and triggers Anchor deployment to the devnet.

## Setup

1. Install dependencies:
   ```
   cd app
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

The server will run on port 3002 by default. You can change this by setting the PORT environment variable.

## Usage

Send a POST request to the `/deploy` endpoint with JSON data containing a `contract_code` field:

```
POST http://localhost:3002/deploy
Content-Type: application/json

{
  "contract_code": "your solana contract code here"
}
```

This endpoint is compatible with the `deployContract` function in the client's interact.ts file.

### Example using curl

```bash
curl -X POST http://localhost:3002/deploy \
  -H "Content-Type: application/json" \
  -d '{"contract_code": "your solana contract code here"}'
```

### Example response

```json
{
  "success": true,
  "message": "Contract deployed successfully",
  "output": "Command output here...",
  "contract_address": "Solana program ID here"
}
```

## Error Handling

If no contract code is provided in the request, the server will respond with a 400 error:

```json
{
  "error": "No contract_code provided in request"
}
```

If the deployment fails, the server will respond with a 500 error including details about what went wrong:

```json
{
  "error": "Deployment failed",
  "details": "Error message here",
  "stderr": "Standard error output here"
}
```