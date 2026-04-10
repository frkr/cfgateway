import { Welcome } from '~/panel/welcome';
import type { Route } from "./+types/panel";
import type { Message } from '@/database';

interface LoaderData {
  requireAuth?: boolean;
  message: string;
  messages: Message[];
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "CF Gateway" },
    { name: "description", content: "Cloudflare Gateway for routing messages" },
  ];
}

export {loader} from "../.server/panel/panel";

export default function Panel({ loaderData }: Route.ComponentProps) {
  const { requireAuth, message, messages } = loaderData as LoaderData;
  return <Welcome requireAuth={requireAuth} message={message} messages={messages} />;
}
