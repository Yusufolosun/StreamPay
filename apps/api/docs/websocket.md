# WebSocket Server Architecture & Protocol

This document details the WebSocket architecture and communication protocol implemented in the StreamPay API server.

## Overview

The WebSocket server runs alongside the HTTP API server on the same port using the `ws` package. It enables client applications to subscribe to real-time events for individual payment streams (e.g., streaming status updates, claims).

## Connection

To connect to the WebSocket server, client applications establish a connection to the server's ws endpoint:

```
ws://<server-host>:<port>/
```

## Protocol Messages

All messages exchanged between the client and the server are formatted in JSON.

### Client Messages (Requests)

#### 1. Subscribe to Stream
To receive real-time updates for a specific stream ID, a client must send a `subscribe` message:

```json
{
  "type": "subscribe",
  "streamId": 42
}
```

#### 2. Unsubscribe from Stream
To stop receiving updates for a specific stream ID, a client sends an `unsubscribe` message:

```json
{
  "type": "unsubscribe",
  "streamId": 42
}
```

### Server Messages (Broadcasts / Responses)

#### 1. Stream Update Notification
When a registered stream receives on-chain updates (e.g., when funds are claimed), the server broadcasts a `stream-update` event to all subscribed clients:

```json
{
  "type": "stream-update",
  "streamId": 42,
  "event": {
    "eventType": "stream-claimed",
    "txId": "0x...",
    "eventIndex": 0,
    "blockHeight": 24680,
    "streamId": 42,
    "claimedAmount": "250000"
  }
}
```

## Lifecycle & Cleanup

- **Subscribers Tracking**: Subscriptions are managed via memory mappings (`streamId -> Set<WebSocket>` and `WebSocket -> Set<streamId>`).
- **Connection Loss**: When a client connection closes (gracefully or due to a network error), all of its subscriptions are automatically cleaned up to prevent memory leaks.
