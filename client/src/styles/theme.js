// Heating Supply App Theme
// Warm orange/red palette reflecting the heating industry
export const themeConfig = {
  token: {
    colorPrimary: '#D4380D',       // Warm orange-red — heat energy
    colorLink: '#D4380D',
    colorSuccess: '#52C41A',
    colorWarning: '#FA8C16',
    colorError: '#FF4D4F',
    colorInfo: '#1890FF',

    borderRadius: 8,
    borderRadiusLG: 10,

    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f5f5',

    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif",

    colorPrimaryHover: '#B22A0A',
    colorPrimaryActive: '#8F2108',
    colorPrimaryBg: '#FFF1E8',
    colorPrimaryBgHover: '#FFD8C4',
    colorPrimaryBorder: '#FFB794',
    colorPrimaryBorderHover: '#FF9A6A',
    colorPrimaryText: '#D4380D',
    colorPrimaryTextHover: '#B22A0A',
  },
  components: {
    Button: {
      controlHeight: 36,
      controlHeightLG: 44,
      primaryShadow: '0 2px 6px rgba(212, 56, 13, 0.25)',
    },
    Card: {
      paddingLG: 20,
      borderRadiusLG: 10,
    },
    Table: {
      borderRadius: 8,
    },
    Input: {
      controlHeight: 36,
    },
    Select: {
      controlHeight: 36,
    },
    InputNumber: {
      controlHeight: 36,
    },
  },
};
