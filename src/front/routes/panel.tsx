import { Welcome } from '~/panel/welcome';
import type { Route } from "./+types/panel";
import type { Message } from '@/database';

interface VersionMeta {
  id?: string;
  tag?: string;
  timestamp?: number;
}

interface LoaderData {
  requireAuth?: boolean;
  message: string;
  messages: Message[];
  version?: VersionMeta;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "CF Gateway" },
    { name: "description", content: "Cloudflare Gateway for routing messages" },
  ];
}

export {loader, action} from "../.server/panel/panel";

export default function Panel({ loaderData }: Route.ComponentProps) {
  const { requireAuth, message, messages, version } = loaderData as LoaderData;
  return <Welcome requireAuth={requireAuth} message={message} messages={messages} version={version} />;
}
