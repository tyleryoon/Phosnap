module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  // vite.config.js 의 define 으로 주입되는 값들.
  // 이게 없으면 main.jsx 가 no-undef 로 잡힌다.
  globals: {
    __BUILD_COMMIT__: 'readonly',
    __BUILD_TIME__: 'readonly',
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    // 따옴표·아포스트로피 escape 강제. 렌더에는 아무 영향이 없고
    // 한국어 문구 위주인 이 코드베이스에서는 소음만 만든다.
    'react/no-unescaped-entities': 'off',
    // 빈 catch 는 localStorage·sessionStorage 폴백에서 정당하다
    // (사생활 모드면 접근 자체가 던진다). 그 외 빈 블록은 계속 막는다.
    'no-empty': ['error', { allowEmptyCatch: true }],
    // 문자 클래스 안의 여분 escape — 동작은 정확하다. 경고로만 둔다.
    'no-useless-escape': 'warn',
    'no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
      },
    ],
    // console.error / console.warn 는 남긴다 — 이 코드베이스는
    // '조용히 실패하지 않는다' 를 원칙으로 쓰고 있고 그게 맞다.
    // 흘리고 다니는 console.log 만 잡는다.
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
