// TypeScript interface for import.meta.env
interface ImportMetaEnv {
  PUBLIC_STRAPI_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

const STRAPI_BASE =
  import.meta.env.PUBLIC_STRAPI_URL?.replace("/api", "") ||
  "http://localhost:1337";

export function renderMedia(asset: any, classes = "w-full h-auto", animate = "media") {
  if (!asset) return null;
  const mediaAsset = asset.data || asset;
  if (!mediaAsset || !mediaAsset.url) return null;
  if (mediaAsset.mime?.startsWith("video/")) {
    return `
      <video
        class="${classes} object-cover"
        autoplay
        muted
        loop
        playsinline
        preload="auto"
        poster="${STRAPI_BASE}${mediaAsset.url}"
        data-animate=""
      >
        <source src="${STRAPI_BASE}${mediaAsset.url}" type="${mediaAsset.mime}" />
        Your browser does not support the video tag.
      </video>
    `;
  } else {
    const srcset = [
      mediaAsset.formats?.small &&
        `${STRAPI_BASE}${mediaAsset.formats.small.url} 500w`,
      mediaAsset.formats?.medium &&
        `${STRAPI_BASE}${mediaAsset.formats.medium.url} 750w`,
      mediaAsset.formats?.large &&
        `${STRAPI_BASE}${mediaAsset.formats.large.url} 1000w`,
      `${STRAPI_BASE}${mediaAsset.url} ${mediaAsset.width}w`,
    ]
      .filter(Boolean)
      .join(", ");
    return `
      <img
        src="${STRAPI_BASE}${mediaAsset.url}"
        srcset="${srcset}"
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 80vw"
        alt="${mediaAsset.alternativeText || `Media asset`}" 
        class="${classes}"
        width="${mediaAsset.width}"
        height="${mediaAsset.height}"
        loading="lazy"
        data-animate=""
      />
    `;
  }
}

export function renderRichText(content: any) {
  if (!content) return "";
  if (Array.isArray(content)) {
    return content
      .map((block: any, index: number) => {
        // Handle different block types
        if (block.type === "paragraph") {
          const text =
            block.children
              ?.map((child: any) => {
                // Handle different child types (text, bold, italic, etc.)
                if (child.type === "text") {
                  // Preserve line breaks within text
                  return child.text.replace(/\n/g, "<br>");
                }
                return child.text || "";
              })
              .join("") || "";
          return text ? `<p class="mb-6 last:mb-0">${text}</p>` : "";
        } else if (block.type === "heading") {
          const level = block.level || 2;
          const text =
            block.children?.map((child: any) => child.text).join("") || "";
          return text
            ? `<h${level} class="mb-4 mt-8 first:mt-0">${text}</h${level}>`
            : "";
        } else if (block.type === "list") {
          const listType = block.format === "ordered" ? "ol" : "ul";
          const items = block.children
            ?.map((item: any) => {
              const itemText =
                item.children?.map((child: any) => child.text).join("") || "";
              return itemText ? `<li class="mb-2">${itemText}</li>` : "";
            })
            .filter(Boolean)
            .join("");
          return items
            ? `<${listType} class="mb-6 list-disc list-inside">${items}</${listType}>`
            : "";
        }
        return "";
      })
      .filter(Boolean)
      .join("");
  }
  // Handle plain string content
  if (typeof content === "string") {
    return `<p class="mb-6 last:mb-0">${content.replace(/\n/g, "<br>")}</p>`;
  }
  return `<p>${content}</p>`;
} 