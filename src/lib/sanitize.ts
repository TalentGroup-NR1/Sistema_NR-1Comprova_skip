import DOMPurify from "dompurify";

/**
 * Sanitização endurecida para conteúdo HTML vindo de usuários
 * (comunicados, feedback, parecer consultivo, etc.).
 *
 * Allowlist explícita — bloqueia <script>, <iframe>, <object>, <embed>,
 * <form>, handlers `on*` e URIs `javascript:` / `data:` em links.
 *
 * Centralizar aqui garante política única; nunca usar
 * `DOMPurify.sanitize` solto em código de UI que renderiza
 * conteúdo de usuário.
 */
const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "hr", "div", "span",
    "strong", "b", "em", "i", "u", "s", "sub", "sup", "mark", "small",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "a", "img",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  ],
  ALLOWED_ATTR: [
    "href", "target", "rel",
    "src", "alt", "title", "width", "height",
    "class", "style",
    "colspan", "rowspan",
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button", "link", "meta", "base"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit", "formaction"],
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
};

// Garante target=_blank seguro em links que sobrevivem à sanitização.
if (typeof window !== "undefined") {
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, RICH_TEXT_CONFIG) as unknown as string;
}
