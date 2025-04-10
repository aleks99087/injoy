let telegramUserId: string | null = null; // ✅ глобальное хранилище userId

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          start_param?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        MainButton: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          enable: () => void;
          disable: () => void;
        };
        colorScheme: 'light' | 'dark';
        themeParams: {
          bg_color: string;
          text_color: string;
          hint_color: string;
          link_color: string;
          button_color: string;
          button_text_color: string;
        };
      };
    }
  }
}

export const isTelegramWebApp = () => {
  return typeof window !== 'undefined' && window.Telegram?.WebApp !== undefined;
};

export const tg = {
  ready: () => {
    if (isTelegramWebApp()) {
      window.Telegram?.WebApp.ready();
    }
  },
  expand: () => {
    if (isTelegramWebApp()) {
      window.Telegram?.WebApp.expand();
    }
  },
  close: () => {
    if (isTelegramWebApp()) {
      window.Telegram?.WebApp.close();
    }
  },
  showBackButton: (callback?: () => void) => {
    if (isTelegramWebApp()) {
      window.Telegram?.WebApp.BackButton.show();
      if (callback) {
        window.Telegram?.WebApp.BackButton.onClick(callback);
      }
    }
  },
  hideBackButton: () => {
    if (isTelegramWebApp()) {
      window.Telegram?.WebApp.BackButton.hide();
    }
  },
  getUser: () => {
    if (isTelegramWebApp()) {
      return window.Telegram?.WebApp.initDataUnsafe.user;
    }
    return undefined;
  },
  getUserId: () => {
    return telegramUserId;
  },
  getColorScheme: () => {
    if (isTelegramWebApp()) {
      return window.Telegram?.WebApp.colorScheme;
    }
    return 'light';
  },
  getStartParam: () => {
    if (isTelegramWebApp()) {
      return window.Telegram?.WebApp.initDataUnsafe.start_param;
    }
    return undefined;
  }
};

export const initTelegram = () => {
  if (isTelegramWebApp()) {
    tg.ready();
    tg.expand();
    const user = tg.getUser();
    if (user?.id) {
      telegramUserId = user.id.toString(); // ✅ сохраняем глобально
    }
  }
};