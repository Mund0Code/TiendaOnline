import { defineAction, ActionError } from "astro:actions";
import { Resend } from "resend";
import { z } from "astro:schema";

const resend = new Resend(import.meta.env.PUBLIC_RESEND_KEY);

export const server = {
  sendMailContact: defineAction({
    accept: "form",
    input: z.object({
      name: z.string().nonempty("Name cannot be empty"),
      email: z.string().email("Invalid email address"),
      message: z.string().nonempty("Message cannot be empty"),
    }),
    handler: async (input) => {
      const { data, error } = await resend.emails.send({
        from: "Acme <onboarding@resend.dev>",
        to: ["juanppdev@gmail.com"],
        headers: { replyTo: input.email },
        subject: "Portfolio: Contact",
        html: `<strong>Name:</strong> ${input.name}<br>
                <strong>Email:</strong> ${input.email}<br><br>
                <strong>Message:</strong><br> ${input.message.replace(/\n/g, "<br>")}`,
      });

      if (error) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }

      return data;
    },
  }),
};
