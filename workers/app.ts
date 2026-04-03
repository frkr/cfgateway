/**
 * This entire file exists for set up Cloudflare Workers with React Router
 */

import { createRequestHandler } from "react-router";
import { HTTP_OK } from "../app/lib/httpcodes";
import type { MQCFGATEWAYType } from '../MQCFGATEWAY';
import database from "./database.json";

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
    
    // TODO Cloudflare Facebook api
    // Cloudflare
    // let facebook = false;
    // try {
    //   facebook = request.cf?.asOrganization === "Facebook";
    // } catch (e) {
    // }
    //
    // if (facebook && request.method === 'GET') {
    //   return challenge(env.META_VERIFY, request);
    //
    
    if (request.method === "OPTIONS") {
      return HTTP_OK();
    }
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
  
  async queue(batch, env): Promise<void> {
    console.log("Processing:",batch.queue,"Total:", batch.messages.length);
    let i={n:1};
    for (const msg of batch.messages) {
      console.log("Processing:",batch.queue,"Msg:", i.n++);
      const now = Date.now();
      let delete_file = true;
      let body: MQCFGATEWAYType | null = null;
      let content = "";
      let status = "processed";
      try {
        body = msg.body as MQCFGATEWAYType;
        const file = await env.CFGATEWAY.get(body.filename);
        content = await file?.text() || "";
        console.log(content);
      } catch (e) {
        console.error("Queue error:", e);
        status = "error";
      } finally {
        if (delete_file) {
          try {
            if (body && body.filename) {
              await env.CFGATEWAY.delete(body.filename);
            }
          } catch (e) {}
        }
        if (body) {
          try {
            await env.DB.prepare(
              database.messages.insert
            ).bind(body.id, body.filename, content, now, status).run();
          } catch (e) {
            console.error("DB error:", e);
          }
        }
        msg.ack();
      }
    }
  }
} satisfies ExportedHandler<Env>;
