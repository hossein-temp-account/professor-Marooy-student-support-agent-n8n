<div dir="rtl">

# ساخت گردش‌کارهای n8n

فایل export گردش‌کار به‌صورت JSON در مخزن commit نشده است. فرمت export در n8n شامل نسخهٔ نوع هر گره، موقعیت رابط کاربری، و ارجاع به credential‌هایی است که فقط در همان نسخهٔ n8n که آن‌ها را تولید کرده معنا دارند. یک export دستی‌نوشته‌شده بیشتر مواقع به‌صورت یک گراف خراب import می‌شود تا یک گردش‌کار سالم. بهتر است گردش‌کار را مستقیماً در رابط کاربری بسازید، سپس از مسیر **Workflows → Export** خروجی بگیرید و پس از تأیید صحت آن را commit کنید.

این پوشه شامل بخش‌هایی است که بدون مشکل قابل‌انتقال‌اند:

- `code/` — برای جای‌گذاری در گره‌های Code
- `sql/` — برای جای‌گذاری در گره‌های MySQL
- `http/` — برای جای‌گذاری در بدنهٔ JSON گره‌های HTTP Request

## Credential‌ها

هر دو را از طریق رابط کاربری n8n بسازید. این‌ها با `N8N_ENCRYPTION_KEY` رمزنگاری می‌شوند و هرگز به‌صورت متن ساده در پارامترهای گره ظاهر نمی‌شوند.

**MySQL** (نوع: MySQL)

| فیلد | مقدار |
|---|---|
| Host | `mysql` |
| Port | `3306` |
| Database | `support_agent` |
| User | مقدار `MYSQL_USER` در `.env` |
| Password | مقدار `MYSQL_PASSWORD` در `.env` |
| SSL | غیرفعال |

نام آن را `MySQL - support_agent` بگذارید.

**OpenRouter** (نوع: Header Auth)

| فیلد | مقدار |
|---|---|
| Name | `Authorization` |
| Value | `Bearer <کلید OpenRouter شما>` |

نام آن را دقیقاً `OpenRouter` بگذارید. گره‌های ۰۴، ۰۸ و گرهٔ ارزیابی V4 همگی به همین نام ارجاع می‌دهند.

## گردش‌کار اصلی — «Student Support Agent»

| # | گره | نوع | تنظیمات کلیدی |
|---|---|---|---|
| 01 | Webhook | Webhook | POST، مسیر `student-support`، Response Mode روی `Respond to Webhook` |
| 02 | Normalize Input | Code | `code/02-normalize-input.js` |
| 03 | Insert Ticket | MySQL | Execute SQL، `sql/03-insert-ticket.sql`، ۶ پارامتر |
| 04 | Classify | HTTP Request | POST، `http/04-classify.json`، Header Auth با نام `OpenRouter` |
| 05 | Validate Classification | Code | `code/05-validate-classification.js` |
| 06 | Search Knowledge Base | MySQL | Execute SQL، `sql/06-search-kb.sql`، ۲ پارامتر |
| 07 | Build Answer Context | Code | `code/07-build-answer-context.js` |
| 07b | Check Knowledge Match | IF | شرط (Boolean): `{{ $json.sufficient_knowledge }}` برابر `true` |
| 08 | Generate Answer *(فقط شاخهٔ true)* | HTTP Request | POST، `http/08-generate-answer.json`، Header Auth با نام `OpenRouter` |
| 09 | Extract Answer *(فقط شاخهٔ true)* | Code | `code/09-extract-answer.js` |
| 09b | Create Human Ticket *(فقط شاخهٔ false)* | Code | `code/09b-create-human-ticket.js` |
| — | Merge | Merge | ۲ ورودی: خروجی گره ۰۹ و خروجی گره ۰۹b |
| 10 | Update Ticket | MySQL | عملیات Update، کلید تطبیق `id` = `{{ $json.ticket_id }}` |
| 11 | Compose Reply | Code | `code/11-compose-reply.js` |
| 12 | Respond to Webhook | Respond to Webhook | JSON، بدنه `{{ $json }}`، کد ۲۰۰ |

**این همان تضمین اصلی پروژه است، این‌بار به‌صورت ساختاری و نه فقط
یک درخواست در پرامپت:** گرهٔ ۰۷b بین جست‌وجو و مدل پاسخ‌گو قرار
می‌گیرد. فقط خروجی `true` آن به گرهٔ ۰۸ وصل است. هیچ سیمی مستقیم از
گرهٔ ۰۷ (یا ۰۶) به گرهٔ ۰۸ وجود ندارد — یعنی وقتی `sufficient_knowledge`
برابر false باشد، مدل پاسخ‌گو اصلاً در دسترس نیست. شاخهٔ `false`
(گرهٔ ۰۹b) پیام «درخواست شما ثبت شد» را با یک گرهٔ Code معمولی
می‌سازد؛ در این مسیر هیچ فراخوانی مدل زبانی رخ نمی‌دهد.

خروجی هر دو گرهٔ ۰۹ و ۰۹b را به یک گرهٔ Merge مشترک وصل کنید، پیش از
گرهٔ ۱۰. چون در هر درخواست فقط یکی از دو شاخه اجرا می‌شود، هر حالت
Merge کار می‌کند؛ نکتهٔ مهم این است که هر دو مسیر پیش از Update Ticket
روی یک سیم جمع شوند.

`sufficient_knowledge` (محاسبه‌شده در گرهٔ ۰۷) نیازمند همهٔ این
شرط‌هاست: جست‌وجوی پایگاه دانش با خطا مواجه نشده باشد، حداقل یک
نتیجهٔ نگه‌داشته‌شده وجود داشته باشد، امتیاز ارتباط بهترین نتیجه
برابر یا بیشتر از `KB_MATCH_THRESHOLD` باشد، و اطمینان طبقه‌بندی
حداقل ۰٫۷۰ باشد. همین شرط آخر دلیل آن است که یک سؤال مبهم حتی با
وجود یک تطبیق سطحی در پایگاه دانش، به کارشناس ارجاع داده می‌شود.

### نگاشت ستون‌های گره ۱۰

| ستون | مقدار |
|---|---|
| `category` | `{{ $json.category }}` |
| `priority` | `{{ $json.priority }}` |
| `confidence` | `{{ $json.confidence }}` |
| `status` | `{{ $json.status }}` |
| `answer` | `{{ $json.answer }}` |
| `matched_kb_ids` | `{{ JSON.stringify($json.matched_kb_ids ?? []) }}` |
| `error_message` | `{{ $json.kb_failed ? 'kb search failed' : $json.failure }}` |

مقدار `status` را خود گرهٔ ۰۹ یا ۰۹b (هرکدام که اجرا شده) تعیین
می‌کند (`answered`، `failed`، یا `escalated` — همه از قبل در ENUM
فایل `schema.sql` موجودند، نیازی به migration نیست). `matched_kb_ids`
باید رشته باشد؛ اگر آرایهٔ خام بفرستید، درایور آن را رد می‌کند.

### پیکربندی

`KB_MATCH_THRESHOLD` (که گرهٔ ۰۷ از طریق `$env` می‌خواند) تنها عدد
قابل‌تنظیم پروژه است: حداقل قدرت تطبیق پایگاه دانش که برای پاسخ
خودکار لازم است. در `.env` تنظیم و از طریق `docker-compose.yml` عبور
داده می‌شود، و به‌صراحت با `N8N_ENV_ACCESS_ALLOWLIST` مجاز شده است
(بقیهٔ متغیرها همچنان با `N8N_BLOCK_ENV_ACCESS_IN_NODE=true` مسدودند).
پیش‌فرض آن، در صورت نبود مقدار، `4.0` است. برای ارجاع بیشتر موارد
مرزی به کارشناس، آن را بالا ببرید؛ برای پاسخ خودکار بیشتر، پایین
بیاورید. آن را با محتوای واقعی پایگاه دانش و
`evals/classification_labels.jsonl` کالیبره کنید — امتیاز ارتباط
MySQL نسبی است، نه یک احتمال کالیبره‌شده.

### سیاست خطا / تلاش مجدد

| گره | On Error | تعداد تلاش | فاصلهٔ انتظار | Timeout |
|---|---|---|---|---|
| ۰۱ Webhook | Stop | 0 | — | — |
| ۰۲ Normalize | Stop | 0 | — | — |
| ۰۳ Insert | Stop | 3 | 1000ms | — |
| ۰۴ Classify | Continue (error output) | 3 | 2000ms | 60000ms |
| ۰۵ Validate | Stop | 0 | — | — |
| ۰۶ Search KB | Continue (error output) | 2 | 1000ms | — |
| ۰۷ Build Context | Stop | 0 | — | — |
| ۰۷b Check Knowledge Match | Stop | 0 | — | — |
| ۰۸ Generate | Continue (error output) | 3 | 2000ms | 60000ms |
| ۰۹ Extract | Stop | 0 | — | — |
| ۰۹b Create Human Ticket | Stop | 0 | — | — |
| ۱۰ Update | Stop | 3 | 1000ms | — |
| ۱۱ Compose | Stop | 0 | — | — |
| ۱۲ Respond | Stop | 0 | — | — |

خروجی خطای گره ۰۴ و گره ۰۶ را به همان گرهٔ پایین‌دستی وصل کنید که معمولاً خروجی اصلی آن‌ها را دریافت می‌کند (به‌ترتیب ۰۵ و ۰۷). n8n فقط روی شاخه‌ای که واقعاً فعال شده خروجی می‌دهد.

سپس: **Workflow Settings → Error Workflow → `Error Handler`**.

## گردش‌کار Error Handler

| # | گره | نوع | یادداشت |
|---|---|---|---|
| E1 | Error Trigger | ErrorTrigger | — |
| E2 | Format Error | Code | `code/e2-format-error.js` |
| E3 | Log to MySQL | MySQL | درج در جدول `error_log`، ۸ ستون از E2 |
| E4 | Alert | NoOp | بعداً با Slack/ایمیل جایگزین کنید |

## گردش‌کار ارزیابی طبقه‌بندی

| # | گره | نوع | یادداشت |
|---|---|---|---|
| V1 | Manual Trigger | ManualTrigger | — |
| V2 | Read Labels | Read Binary File | مسیر `/evals/classification_labels.jsonl`، پراپرتی `data` |
| V3 | Parse Labels | Code | `code/v3-parse-labels.js` |
| V4 | Classify | HTTP Request | مشابه گرهٔ ۰۴. Batching: اندازهٔ ۳، فاصلهٔ ۵۰۰ میلی‌ثانیه |
| V5 | Score | Code | `code/v5-score.js` |
| V6 | Aggregate | Code | `code/v6-aggregate.js` |

V1 را اجرا کنید. ابتدا `summary.category_accuracy`، سپس `per_category`، سپس `confusion` را بررسی کنید. ماتریس Confusion چیزی است که به شما می‌گوید پرامپت را چگونه اصلاح کنید.

معیار پایه برای عبور از آن با `openai/gpt-4o-mini` روی این مجموعه‌برچسب: دقت دسته‌بندی ۰٫۸۵ تا ۰٫۹۵. کمتر از ۰٫۸۰ یعنی پرامپت باید موارد مبهم را صراحتاً نام ببرد. دقت ۱٫۰۰ یعنی مجموعه‌داده خیلی ساده است — پیش از اعتماد به این عدد، ردیف‌های دشوارتر اضافه کنید.

## استفاده از `require('crypto')` در گرهٔ ۰۲

اجراکنندهٔ پیش‌فرض گره Code دسترسی به ماژول‌های داخلی را مجاز می‌کند. با `N8N_RUNNERS_ENABLED=true` (تنظیم‌شده در `docker-compose.yml`)، ممکن است n8n اجراکننده را طوری sandbox کند که `require('crypto')` در دسترس نباشد. اگر گرهٔ ۰۲ خطای `require is not defined` داد، یکی از این دو کار را انجام دهید:

۱. `N8N_RUNNERS_ENABLED` را از فایل compose حذف کنید، یا
۲. فراخوانی SHA-256 را با یک هش خالص جاوااسکریپتی جایگزین کنید و بپذیرید که هش کوتاه‌تر در حجم بالا برخورد (collision) بیشتری دارد.

گزینهٔ ترجیحی: گزینهٔ اول. مرز امنیتی task runner زمانی اهمیت دارد که کد نامعتبر اجرا کنید؛ اینجا همهٔ گره‌های Code متعلق به خود شماست، پس این مرز سود چندانی ندارد.

</div>
