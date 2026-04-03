import type { Route } from "./+types/panel";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "CF Gateway" },
    { name: "description", content: "Cloudflare Gateway for routing messages" },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  return { message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE };
}

export default function Panel({ loaderData: { message } }: Route.ComponentProps) {
  return <Welcome message={message} />;
}
