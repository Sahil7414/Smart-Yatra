import React, { useEffect, useState } from 'react';
import { Bell, Globe, ShieldCheck } from 'lucide-react';

const SETTINGS_KEY = 'smart_travel_settings_v1';

const SettingsPage = () => {
    const [settings, setSettings] = useState({
        notifications: true,
        language: 'English',
        shareAnalytics: false,
    });

    useEffect(() => {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            setSettings((prev) => ({ ...prev, ...parsed }));
        } catch {
            // ignore malformed local storage values
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }, [settings]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] px-4 md:px-8 py-10 pt-20 lg:pt-10">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8 font-black uppercase tracking-[0.24em] text-blue-600">
                    <p className="text-[11px]">Settings</p>
                    <h1 className="text-3xl md:text-4xl text-[#0F172A] mt-2 normal-case tracking-normal font-black">Profile Preferences</h1>
                    <p className="text-[#64748B] font-medium mt-3 text-sm md:text-base normal-case tracking-normal">
                        These settings are saved locally in your browser.
                    </p>
                </div>

                <div className="space-y-4">
                    <SettingRow
                        icon={<Bell size={18} />}
                        label="Trip Notifications"
                        description="Receive reminders and trip updates."
                        control={(
                            <Toggle
                                enabled={settings.notifications}
                                onToggle={() => setSettings((s) => ({ ...s, notifications: !s.notifications }))}
                            />
                        )}
                    />

                    <SettingRow
                        icon={<Globe size={18} />}
                        label="Language"
                        description="Choose your preferred interface language."
                        control={(
                            <select
                                value={settings.language}
                                onChange={(e) => setSettings((s) => ({ ...s, language: e.target.value }))}
                                className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white font-semibold text-sm outline-none"
                            >
                                <option>English</option>
                                <option>Hindi</option>
                            </select>
                        )}
                    />

                    <SettingRow
                        icon={<ShieldCheck size={18} />}
                        label="Share Anonymous Analytics"
                        description="Help improve route quality with anonymous usage signals."
                        control={(
                            <Toggle
                                enabled={settings.shareAnalytics}
                                onToggle={() => setSettings((s) => ({ ...s, shareAnalytics: !s.shareAnalytics }))}
                            />
                        )}
                    />
                </div>
            </div>
        </div>
    );
};

const SettingRow = ({ icon, label, description, control }) => (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div>
                <p className="text-sm font-black text-[#0F172A]">{label}</p>
                <p className="text-sm text-[#64748B] font-medium mt-1">{description}</p>
            </div>
        </div>
        <div className="shrink-0">{control}</div>
    </div>
);

const Toggle = ({ enabled, onToggle }) => (
    <button
        type="button"
        onClick={onToggle}
        className={`w-12 h-7 rounded-full p-1 transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
        aria-pressed={enabled}
    >
        <span
            className={`block w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
        />
    </button>
);

export default SettingsPage;
