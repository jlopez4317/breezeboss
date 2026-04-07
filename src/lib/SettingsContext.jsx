import React, { createContext, useState, useContext, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const queryClient = useQueryClient();
  
  // Fetch settings from database
  const { data: settingsList = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.Settings.list(),
    staleTime: 0, // Always fetch fresh
  });

  const settings = settingsList[0] || {};

  const defaultTaxRate = settings.defaultTaxRate ?? 0;
  const defaultMarkup = settings.defaultMarkup ?? 0;
  const hourlyLaborRate = settings.defaultHourlyLaborRate ?? 0;
  const laborOnlyRate = settings.laborOnlyRate ?? 0;

  const refreshSettings = () => {
    queryClient.invalidateQueries({ queryKey: ['settings'] });
  };

  const saveSettings = async (data) => {
    const cleanedData = {
      companyName: data.companyName || '',
      companyPhone: data.companyPhone || '',
      companyEmail: data.companyEmail || '',
      companyWebsite: data.companyWebsite || '',
      companyAddress: data.companyAddress || '',
      companyCity: data.companyCity || '',
      companyState: data.companyState || '',
      companyZip: data.companyZip || '',
      licenseNumber: data.licenseNumber || '',
      insuranceInfo: data.insuranceInfo || '',
      logoUrl: data.logoUrl || '',
      defaultTaxRate: parseFloat(data.defaultTaxRate) || 0,
      defaultMarkup: parseFloat(data.defaultMarkup) || 0,
      defaultHourlyLaborRate: parseFloat(data.defaultHourlyLaborRate) || 0,
      laborOnlyRate: parseFloat(data.laborOnlyRate) || 0,
      laborWarranty: data.laborWarranty || '',
      stripeLink: data.stripeLink || '',
      squareLink: data.squareLink || '',
      zelleInfo: data.zelleInfo || '',
      venmoHandle: data.venmoHandle || '',
      paypalLink: data.paypalLink || '',
      googleReviewUrl: data.googleReviewUrl || '',
      facebookReviewUrl: data.facebookReviewUrl || '',
      yelpUrl: data.yelpUrl || '',
      nextdoorUrl: data.nextdoorUrl || '',
      resendApiKey: data.resendApiKey || '',
      resendFromEmail: data.resendFromEmail || '',
      resendFromName: data.resendFromName || '',
      financeVendors: data.financeVendors || '[]',
    };

    if (settings.id) {
      await base44.entities.Settings.update(settings.id, cleanedData);
    } else {
      await base44.entities.Settings.create(cleanedData);
    }

    // Refresh settings immediately after save
    refreshSettings();
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      defaultTaxRate,
      defaultMarkup,
      hourlyLaborRate,
      laborOnlyRate,
      refreshSettings,
      saveSettings,
      appSettings: settings,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};