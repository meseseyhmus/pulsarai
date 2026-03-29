import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeviceSelector from '../components/DeviceSelector';
import type { AudioDevice } from '../hooks/useMediaDevices';

const mockInputs: AudioDevice[] = [
  { deviceId: 'mic1', label: 'Test Mikrofon 1', kind: 'audioinput' },
  { deviceId: 'mic2', label: 'Test Mikrofon 2', kind: 'audioinput' },
];

const mockOutputs: AudioDevice[] = [
  { deviceId: 'spk1', label: 'Test Hoparlör 1', kind: 'audiooutput' },
];

const defaultProps = {
  open: true,
  audioInputs: mockInputs,
  audioOutputs: mockOutputs,
  selectedMicId: 'mic1',
  selectedSpeakerId: 'spk1',
  micLevel: 0,
  onSelectMic: vi.fn(),
  onSelectSpeaker: vi.fn(),
  startMicPreview: vi.fn().mockResolvedValue(undefined),
  stopMicPreview: vi.fn(),
  testSpeaker: vi.fn(),
  onConfirm: vi.fn(),
  onClose: vi.fn(),
};

describe('DeviceSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('"AUDIO CONFIGURATION" başlığı render edilir', () => {
    render(<DeviceSelector {...defaultProps} />);
    expect(screen.getByText('AUDIO CONFIGURATION')).toBeInTheDocument();
  });

  it('audioInputs cihazları listede görünür', () => {
    render(<DeviceSelector {...defaultProps} />);
    expect(screen.getByText('Test Mikrofon 1')).toBeInTheDocument();
    expect(screen.getByText('Test Mikrofon 2')).toBeInTheDocument();
  });

  it('audioOutputs cihazları listede görünür', () => {
    render(<DeviceSelector {...defaultProps} />);
    expect(screen.getByText('Test Hoparlör 1')).toBeInTheDocument();
  });

  it('ONAYLA butonuna tıklanınca onConfirm çağrılır', () => {
    render(<DeviceSelector {...defaultProps} />);
    fireEvent.click(screen.getByText(/ONAYLA VE BAŞLAT/i));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith('mic1', 'spk1');
  });

  it('İPTAL butonuna tıklanınca onClose çağrılır', () => {
    render(<DeviceSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('İPTAL'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('TEST SES butonuna tıklanınca testSpeaker çağrılır', () => {
    render(<DeviceSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('TEST SES'));
    expect(defaultProps.testSpeaker).toHaveBeenCalledWith('spk1');
  });

  it('open=false olduğunda hiçbir şey render edilmez', () => {
    render(<DeviceSelector {...defaultProps} open={false} />);
    expect(screen.queryByText('AUDIO CONFIGURATION')).not.toBeInTheDocument();
  });

  it('Mikrofon select değişince onSelectMic çağrılır', () => {
    render(<DeviceSelector {...defaultProps} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'mic2' } });
    expect(defaultProps.onSelectMic).toHaveBeenCalledWith('mic2');
  });
});
