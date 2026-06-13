'use client';

import { useEffect, useState } from 'react';
import { weatherApi } from '@/lib/api';
import { useWeatherLocation } from '@/hooks/useWeatherLocation';
import { filterWeatherWarningsByLocation } from '@/lib/dashboard/summary';

type WeatherRiskMode = 'calendar' | 'stock';

interface WeatherRiskSignal {
  planningNote: string;
  riskNote: string;
  warningMessage: string;
}

export function useWeatherRiskSignal(mode: WeatherRiskMode): WeatherRiskSignal {
  const [signal, setSignal] = useState<WeatherRiskSignal>({
    planningNote: '',
    riskNote: '',
    warningMessage: '',
  });
  const { activeAdm4, activeLocationLabel } = useWeatherLocation();

  useEffect(() => {
    let active = true;

    async function loadWeatherRiskSignal() {
      try {
        if (!activeAdm4) {
          setSignal({ planningNote: '', riskNote: '', warningMessage: '' });
          return;
        }

        const [forecast, warnings] = await Promise.all([
          weatherApi.getForecast({ adm4: activeAdm4, locationLabel: activeLocationLabel }),
          weatherApi.getWarnings(),
        ]);
        if (!active) return;

        const relevantWarnings = filterWeatherWarningsByLocation(warnings.warnings, activeLocationLabel);
        const topWarning = relevantWarnings[0];
        const warningText = topWarning ? topWarning.headline || topWarning.description || topWarning.event : '';

        if (mode === 'calendar') {
          const wetDay = forecast?.days.find((day) => day.totalRainfallMm >= 15);
          setSignal({
            warningMessage: warningText,
            planningNote: wetDay
              ? `Saran kalender: ${wetDay.date} berpotensi hujan ${wetDay.totalRainfallMm}mm, prioritaskan pekerjaan non-lapang.`
              : '',
            riskNote: '',
          });
          return;
        }

        if (warningText) {
          setSignal({
            warningMessage: '',
            planningNote: '',
            riskNote: `Peringatan BMKG: ${warningText}`,
          });
          return;
        }

        const wetDay = forecast?.days.find((day) => day.totalRainfallMm >= 20);
        setSignal({
          warningMessage: '',
          planningNote: '',
          riskNote: wetDay
            ? `Risiko distribusi: ${wetDay.date} diprediksi hujan ${wetDay.totalRainfallMm}mm. Siapkan pengemasan dan jalur kirim cadangan.`
            : '',
        });
      } catch {
        if (!active) return;
        setSignal({ planningNote: '', riskNote: '', warningMessage: '' });
      }
    }

    void loadWeatherRiskSignal();
    return () => {
      active = false;
    };
  }, [activeAdm4, activeLocationLabel, mode]);

  return signal;
}
