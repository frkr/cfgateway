/**
 * This entire file exists for set up Cloudflare Workers with React Router
 */

import { createRequestHandler } from "react-router";
import { HTTP_OK } from "../app/lib/httpcodes";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return HTTP_OK();
    }
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
  
  async queue(batch, env): Promise<void> {
    console.log("Processing:",batch.queue, batch.messages.length);
    let i=1
    for (const msg of batch.messages) {
      console.log("Processing:",i++);
      let delete_file = true;
      try {
        // queue processing logic
      } catch (e) {
        console.error("Queue error:", e);
      } finally {
        if (delete_file) {
          try {
            const messageBody = msg.body as any;
            if (messageBody.id) {
              await env.CFGATEWAY.delete(messageBody.id + ".txt");
            }
          } catch (e) {}
        }
        msg.ack();
      }
    }
  }
} satisfies ExportedHandler<Env>;
