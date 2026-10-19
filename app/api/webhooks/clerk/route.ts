import { db } from "@/db";
import { userTable } from "@/db/schema/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error("WEBHOOK_SECRET not found in environment variables");
  }

  const headersPayload = await headers();

  const svixId = headersPayload.get("svix-id");
  const svixTimestamp = headersPayload.get("svix-timestamp");
  const svixSignature = headersPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ message: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.text();

  const wh = new Webhook(WEBHOOK_SECRET);
  let event: WebhookEvent;
  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;

    if (event.type === "user.created") {
      const { id, email_addresses, first_name, last_name, image_url } =
        event.data;
      await db.insert(userTable).values({
        clerkId: id,
        email: email_addresses[0]?.email_address || "",
        name: `${first_name} ${last_name}`,
        avatar: image_url,
      });
    }
    if (event.type === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } =
        event.data;
      await db
        .update(userTable)
        .set({
          clerkId: id,
          email: email_addresses[0].email_address,
          name: `${first_name} ${last_name}`,
          avatar: image_url,
        })
        .where(eq(userTable.clerkId, id));
    }

      if (event.type === "user.deleted") {
      const { id } = event.data;
      if (!id) {
        return Response.json({ message: "Missing user id" }, { status: 400 });
      }

      await db.delete(userTable).where(eq(userTable.clerkId, id));
    }
  }
  catch (error) {
    return Response.json(
      {
        message: "Error while webhook",
        error: error,
      },
      {
        status: 401,
      },
    );
  }

  console.log(event);
  return Response.json(
    {
      success: true,
      message: "Webhook verified successfully",
    },
    {
      status: 200,
    },
  );
}


// app/api/webhooks/clerk/route.ts

// export async function GET() {
//   return Response.json({
//     success: true,
//   });
// }