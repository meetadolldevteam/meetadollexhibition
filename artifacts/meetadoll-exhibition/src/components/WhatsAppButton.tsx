const WHATSAPP_URL = "https://wa.me/2348120201518?text=Hello%20Meetadoll%20Exhibition%2C%20I%27d%20like%20to%20enquire%20about%20a%20vendor%20stall.";

const WhatsAppButton = () => (
  <a
    href={WHATSAPP_URL}
    target="_blank"
    rel="noreferrer"
    aria-label="Chat with us on WhatsApp"
    className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#25D366] text-white px-4 py-3 shadow-lg hover:scale-105 active:scale-95 transition-transform"
  >
    <svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M19.11 17.21c-.27-.13-1.6-.79-1.85-.88-.25-.09-.43-.13-.61.13-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.13-1.14-.42-2.17-1.34-.8-.71-1.34-1.59-1.5-1.86-.16-.27-.02-.41.12-.54.12-.12.27-.32.41-.48.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.48-.07-.13-.61-1.47-.83-2.01-.22-.53-.45-.46-.61-.47l-.52-.01c-.18 0-.48.07-.73.34s-.96.94-.96 2.28.98 2.65 1.12 2.83c.13.18 1.93 2.95 4.68 4.13.65.28 1.16.45 1.56.58.66.21 1.25.18 1.72.11.53-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.31zM16.02 5.33C10.13 5.33 5.33 10.12 5.33 16c0 2.07.6 4 1.64 5.62L5.33 26.67l5.21-1.61A10.6 10.6 0 0 0 16.02 26.67c5.89 0 10.68-4.79 10.68-10.67S21.91 5.33 16.02 5.33zm0 19.49a8.82 8.82 0 0 1-4.5-1.23l-.32-.19-3.09.96.99-3.01-.21-.32a8.82 8.82 0 1 1 16.32-4.7c0 4.86-3.96 8.82-8.82 8.82z"/>
    </svg>
    <span className="hidden sm:inline text-sm font-semibold">WhatsApp</span>
  </a>
);

export default WhatsAppButton;
