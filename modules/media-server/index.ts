// Re-export the native module. On web, it will be resolved to MediaServerModule.web.ts
// and on native platforms to MediaServerModule.ts
export {default} from "./src/MediaServerModule";
export * from "./src/MediaServer.types";
