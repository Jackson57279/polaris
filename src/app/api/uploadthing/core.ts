import { createRouteHandlerClient } from "uploadthing/server";
import { ourFileRouter } from "@/lib/uploadthing";

export const { GET, POST } = createRouteHandlerClient({
  router: ourFileRouter,
});
