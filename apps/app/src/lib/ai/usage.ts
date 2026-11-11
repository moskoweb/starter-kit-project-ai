import "server-only";
import { sql } from "drizzle-orm";
import type { TenantTransaction } from "@vibe/db";

export async function reserveAiUsage(tx: TenantTransaction, tenantId: string | null, maxRequests: number, maxOutputTokens: number, maxDailyTokens: number) {
  const rows = tenantId === null
    ? await tx.execute(sql`
        insert into ai_usage_daily (user_id, organization_id, usage_date, requests, reserved_output_tokens)
        values (${sql`current_setting('app.current_user_id', true)::uuid`}, null, current_date, 1, ${maxOutputTokens})
        on conflict (user_id, usage_date) where organization_id is null do update
          set requests = ai_usage_daily.requests + 1,
              reserved_output_tokens = ai_usage_daily.reserved_output_tokens + excluded.reserved_output_tokens
          where ai_usage_daily.requests < ${maxRequests}
            and ai_usage_daily.reserved_output_tokens + excluded.reserved_output_tokens <= ${maxDailyTokens}
        returning requests
      `)
    : await tx.execute(sql`
        insert into ai_usage_daily (user_id, organization_id, usage_date, requests, reserved_output_tokens)
        values (${sql`current_setting('app.current_user_id')::uuid`}, ${tenantId}::uuid, current_date, 1, ${maxOutputTokens})
        on conflict (user_id, usage_date, organization_id) where organization_id is not null do update
          set requests = ai_usage_daily.requests + 1,
              reserved_output_tokens = ai_usage_daily.reserved_output_tokens + excluded.reserved_output_tokens
          where ai_usage_daily.requests < ${maxRequests}
            and ai_usage_daily.reserved_output_tokens + excluded.reserved_output_tokens <= ${maxDailyTokens}
        returning requests
      `);
  if (!rows.length) throw new Error("AI_QUOTA_EXCEEDED");
}
