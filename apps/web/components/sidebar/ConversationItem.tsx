"use client";

type Props = {
  id: string;
  title: string;
  isActive: boolean;
  menuOpen: boolean;
  onClick: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onRequestDelete: () => void;
  hideMenu?: boolean;
};

export function ConversationItem({
  title,
  isActive,
  menuOpen,
  onClick,
  onToggleMenu,
  onCloseMenu,
  onRequestDelete,
  hideMenu,
}: Props) {
  const wrapperBase =
    "group relative w-full rounded-md transition-colors text-sm";
  const wrapperState = isActive
    ? "bg-white border border-gray-200 text-gray-900 shadow-sm"
    : "text-gray-500 hover:bg-white/60 hover:text-gray-800";

  const dotsVisibility = menuOpen
    ? "opacity-100"
    : "opacity-0 group-hover:opacity-100 focus:opacity-100";

  return (
    <div className={`${wrapperBase} ${wrapperState}`}>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left px-3 py-2 truncate ${
          hideMenu ? "" : "pr-8"
        }`}
        title={title}
      >
        {title}
      </button>

      {!hideMenu && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu();
          }}
          aria-label="Tùy chọn hội thoại"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={`absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-opacity ${dotsVisibility}`}
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
            <circle cx="4" cy="10" r="1.6" />
            <circle cx="10" cy="10" r="1.6" />
            <circle cx="16" cy="10" r="1.6" />
          </svg>
        </button>
      )}

      {!hideMenu && menuOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={onCloseMenu}
            aria-hidden
          />
          <div
            role="menu"
            className="absolute right-1 top-9 z-40 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete();
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
              Xóa
            </button>
          </div>
        </>
      )}
    </div>
  );
}
