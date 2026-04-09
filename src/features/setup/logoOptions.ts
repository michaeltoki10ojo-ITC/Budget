const ACCOUNT_LOGO_MODULES = import.meta.glob(
  '../../../account logos/*.{png,jpg,jpeg,webp,svg,avif}',
  {
    eager: true,
    import: 'default'
  }
) as Record<string, string>;

const ACCOUNT_LOGO_METADATA: Record<string, { id: string; label: string }> = {
  'bank-of-america-4-logo-png-transparent': {
    id: 'bank-of-america',
    label: 'Bank of America'
  },
  Cash_App_Logo: {
    id: 'cash-app',
    label: 'Cash App'
  },
  Paypal_Logo: {
    id: 'paypal',
    label: 'PayPal'
  },
  Venmo_logo: {
    id: 'venmo',
    label: 'Venmo'
  }
};

export type PresetLogoOption = {
  id: string;
  label: string;
  src: string;
};

function getFileBaseName(path: string): string {
  return path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? path;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function deriveLabel(baseName: string): string {
  const cleaned = baseName
    .replace(/\blogo\b/gi, ' ')
    .replace(/\btransparent\b/gi, ' ')
    .replace(/\bpng\b/gi, ' ')
    .replace(/\bjpg\b/gi, ' ')
    .replace(/\bjpeg\b/gi, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return toTitleCase(cleaned || baseName);
}

export const ACCOUNT_LOGO_OPTIONS: PresetLogoOption[] = Object.entries(ACCOUNT_LOGO_MODULES)
  .map(([path, src]) => {
    const baseName = getFileBaseName(path);
    const metadata = ACCOUNT_LOGO_METADATA[baseName];

    return {
      id: metadata?.id ?? slugify(baseName),
      label: metadata?.label ?? deriveLabel(baseName),
      src
    };
  })
  .sort((left, right) => left.label.localeCompare(right.label));

export async function presetLogoToFile(preset: PresetLogoOption): Promise<File> {
  const response = await fetch(preset.src);
  const blob = await response.blob();
  const extension = preset.src.split('.').pop()?.split('?')[0] ?? 'png';

  return new File([blob], `${preset.id}.${extension}`, {
    type: blob.type || 'image/png'
  });
}
