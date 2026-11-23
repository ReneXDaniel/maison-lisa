# Managing content (for Lisa)

Everything on the site is edited in the **Atelier**. Sign in with the admin account and you are taken to `/admin` automatically. Pages that hold text in several languages have one tab per language. A language you leave empty falls back to the English text.

## Replace the demo artwork

All images in the development database are **demo artwork** and carry a small "Demo artwork" label. They do not show a real person. Replace them as follows.

**Site images:** go to Atelier → Media and upload your photograph, then assign it to a slot:

| Slot | Where it appears |
|---|---|
| Hero | Full-screen image at the top of the homepage |
| Silk reveal | Image behind the WebGL silk on the homepage |
| Detail photograph | "A world of beautiful details". Adjust the hotspot positions in `src/app/[locale]/(site)/page.tsx` (`HOTSPOTS`) if the composition changes. |
| About portrait | About Lisa page |
| Behind the scenes | Silent gallery on the About page (several images) |
| Nail Studio photo / Nail Studio mask | Nail Studio (see below) |

The Look Studio preview is drawn rather than photographed and needs no image.

**Nail Studio:**
- Upload a photograph and assign it to **Nail Studio photo**.
- Upload a mask with exactly the same pixel size and assign it to **Nail Studio mask**. It should be white where the nails are and black everywhere else, with soft edges for a natural result.
- The studio recolours only the white areas and keeps the photo's own light and gloss.
- You can paint a mask in any image editor on a layer over the photo.

**Products and collections:** go to Atelier → Products. For each product:
- Upload the **originals**. These are delivered only to buyers, through protected links.
- Upload the **previews**. Previews are re-encoded and watermarked "MAISON LISA · PREVIEW" automatically.
- Tick *Previews beyond the cover only for verified adults* to keep every preview except the cover for age-verified adults.
- Collections (Atelier → Collections) have a cover image and texts per language.

**"Behind the Silk" frame sequence (optional):** the homepage draws a stocking animation, and you can replace it with a real photographed sequence:
1. Host the numbered frames, for example `frame-0001.webp` … `frame-0120.webp`.
2. Host a `manifest.json` next to them:

   ```json
   { "frames": 120, "pattern": "https://cdn.example.com/stocking/frame-{0000}.webp" }
   ```

3. Paste the manifest URL into Atelier → Settings.
4. Add the host to `CSP_EXTRA_IMG` and `CSP_EXTRA_CONNECT`.

## Texts

- **Atelier → Content:** homepage statements, About cards, the "Behind the Silk" title, and other short texts, per language. The defaults on the About page are deliberately written as placeholders for *your own words*.
- **Atelier → Releases:** announcements for "The Next Chapter", with an optional date for the countdown.
- **Atelier → Looks:** create a "Choose Lisa's Next Look" poll. Only verified customers can vote, once each, and they can change their vote while the poll is open.
- **Atelier → Discounts:** set the welcome discount percentage and create codes with limits, dates, minimum order and scope.

## Daily work

- **Messages:** your inbox with filters (unread, waiting for you, flagged, archived). Inside a conversation you can see the customer's details, write private notes, change the status, flag, archive or block, and send a **personal offer** linked to a request.
- **Requests → a request:** when the offer has been paid, set the status to *In production*, upload the photographs under *Delivery*, then click **Mark as delivered**. The customer is notified and finds the files under *My purchases*.
- **Orders and Payments:** order details, payment events, refunds and chargebacks.
