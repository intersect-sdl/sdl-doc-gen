export function generateOpenAPIEmbed(specUrl: string): string {
  return `<iframe src='https://redocly.github.io/redoc/?url=${specUrl}' width='100%' height='1000px'></iframe>`;
}
