'use client';

import React, { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { Box, Typography, Tooltip, Divider } from '@mui/material';
import { formatRupiah } from '@/lib/formatters';
import { useLocale, useTranslations } from 'next-intl';
import { normalizeRegionName } from '@/lib/commodityPriceRegions';

interface EastJavaMapProps {
  data: { name: string; price: number }[];
  averagePrice: number;
}

const EastJavaMap: React.FC<EastJavaMapProps> = ({ data, averagePrice }) => {
  const t = useTranslations('KabarPasar.priceChart.map');
  const locale = useLocale();
  const [hoveredRegion, setHoveredRegion] = useState<{ name: string; price: number | null } | null>(null);
  const currentDate = useMemo(() => {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());
  }, [locale]);

  const normalizedPrices = useMemo(() => {
    return data.map((item) => ({
      key: normalizeRegionName(item.name),
      value: item,
    }));
  }, [data]);

  const priceByRegion = useMemo(() => {
    return new Map(normalizedPrices.map((item) => [item.key, item.value]));
  }, [normalizedPrices]);

  const getDataForGeo = (geoName: string) => {
    const cleanGeoName = normalizeRegionName(geoName);
    return priceByRegion.get(cleanGeoName)
      || normalizedPrices.find((item) => cleanGeoName.includes(item.key) || item.key.includes(cleanGeoName))?.value
      || null;
  };

  // Colorblind-safe: orange / green / blue
  const getColor = (price: number | undefined) => {
    if (!price) return '#9ca3af';
    if (price > averagePrice * 1.1) return '#1d4ed8';
    if (price < averagePrice * 0.9) return '#f97316';
    return '#16a34a';
  };

  const { totalRegions, aboveAvg, belowAvg, inRange } = useMemo(() => {
    const total = data.length;
    const above = data.filter(d => d.price > averagePrice * 1.1).length;
    const below = data.filter(d => d.price < averagePrice * 0.9).length;
    return {
      totalRegions: total,
      aboveAvg: above,
      belowAvg: below,
      inRange: total - above - below,
    };
  }, [averagePrice, data]);

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        borderRadius: '0 0 16px 16px',
        overflow: 'hidden',
        minHeight: { xs: 280, md: 260 },
      }}
    >
      {/* ─── Left: Map (65%) ───────────────────────────────────────── */}
      <Box
        sx={{
          flex: { xs: 'none', md: '0 0 65%' },
          width: { xs: '100%', md: '65%' },
          bgcolor: '#dde8f5',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: { xs: 220, md: 260 },
        }}
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 6800,
            center: [113.0, -7.6],
          }}
          style={{ width: '100%', height: '100%' }}
          height={260}
        >
          <Geographies geography="/jatim-kab.geojson">
            {({ geographies }) =>
              geographies.map((geo) => {
                const geoData = getDataForGeo(geo.properties.NAME_2);
                return (
                  <Tooltip
                    key={geo.rsmKey}
                    title={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {geo.properties.NAME_2}
                        </Typography>
                        <Typography variant="caption">
                          {geoData ? formatRupiah(geoData.price) : t('noData')}
                        </Typography>
                      </Box>
                    }
                    placement="top"
                    arrow
                  >
                    <Geography
                      geography={geo}
                      fill={getColor(geoData?.price)}
                      stroke="#ffffff"
                      strokeWidth={0.6}
                      style={{
                        default: { outline: 'none', transition: 'opacity 0.15s' },
                        hover: { opacity: 0.75, outline: 'none', cursor: 'pointer' },
                        pressed: { opacity: 0.6, outline: 'none' },
                      }}
                      onMouseEnter={() =>
                        setHoveredRegion({
                          name: geo.properties.NAME_2,
                          price: geoData?.price ?? null,
                        })
                      }
                      onMouseLeave={() => setHoveredRegion(null)}
                    />
                  </Tooltip>
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {/* Hovered region label at bottom center */}
        {hoveredRegion && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'rgba(0,0,0,0.75)',
              color: 'white',
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {hoveredRegion.name}
              {hoveredRegion.price ? ` - ${formatRupiah(hoveredRegion.price)}` : ` - ${t('noData')}`}
            </Typography>
          </Box>
        )}
      </Box>

      {/* ─── Right: Info Panel (35%) ──────────────────────────────── */}
      <Box
        sx={{
          flex: { xs: 'none', md: '0 0 35%' },
          width: { xs: '100%', md: '35%' },
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { xs: 2, md: 2.5 },
          gap: 2,
        }}
      >
        {/* Average Price */}
        <Box>
          <Typography
            variant="caption"
            sx={{ color: 'text.disabled', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}
          >
            {t('averagePriceTitle')}
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: 'block', color: 'text.secondary', fontSize: '0.72rem', mb: 0.5 }}
          >
            {currentDate}
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'var(--font-sora)',
              fontWeight: 800,
              color: averagePrice > 0 ? 'text.primary' : 'text.disabled',
              lineHeight: 1.1,
              fontSize: { xs: '1.6rem', md: '2rem' },
            }}
          >
            {averagePrice > 0 ? formatRupiah(averagePrice) : '—'}
          </Typography>
          {averagePrice > 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              {t('commodityUnit')}
            </Typography>
          )}
        </Box>

        <Divider />

        {/* Distribution Stats */}
        {totalRegions > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {t('distributionTitle')}
            </Typography>
            {[
              { color: '#f97316', count: belowAvg, label: t('distribution.belowAverage') },
              { color: '#16a34a', count: inRange, label: t('distribution.withinRange') },
              { color: '#1d4ed8', count: aboveAvg, label: t('distribution.aboveAverage') },
            ].map(({ color, count, label }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, bgcolor: color, borderRadius: 0.5, flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                    {label}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.8rem' }}>
                  {count}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        <Divider />

        {/* Legend */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {t('legendTitle')}
          </Typography>
          {[
            { color: '#f97316', label: t('legend.belowProvinceAverage') },
            { color: '#16a34a', label: t('legend.withinProvinceAverage') },
            { color: '#1d4ed8', label: t('legend.aboveProvinceAverage') },
            { color: '#9ca3af', label: t('legend.noData') },
          ].map(({ color, label }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, bgcolor: color, borderRadius: 0.5, flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', lineHeight: 1.4 }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default EastJavaMap;
