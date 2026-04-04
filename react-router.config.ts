// @ts-ignore
import type { Config } from "@react-router/dev/config";

// @ts-ignore
export default {
  appDirectory: "src/front",
  ssr: true,
  future: {
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
