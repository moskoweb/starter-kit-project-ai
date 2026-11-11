CREATE TABLE "totp_replay" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"last_step" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "totp_replay" ADD CONSTRAINT "totp_replay_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;