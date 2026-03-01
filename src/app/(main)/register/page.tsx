'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAccount, useSignMessage } from 'wagmi';
import { Loader2, AlertCircle, CheckCircle2, Wallet } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WalletConnectButton } from '@/components/shared/wallet-connect-button';
import { useRegisterAgent } from '@/hooks/use-register-agent';
import { cn } from '@/lib/utils/index';

/**
 * Form validation schema
 */
const formSchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must not exceed 50 characters'),
  type: z.enum(['TRADING', 'LENDING', 'GOVERNANCE', 'ORACLE', 'CUSTOM'], {
    errorMap: () => ({ message: 'Please select an agent type' }),
  }),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
});

type FormData = z.infer<typeof formSchema>;

const AGENT_TYPES = [
  { value: 'TRADING', label: 'Trading', description: 'Automated trading bots' },
  { value: 'LENDING', label: 'Lending', description: 'DeFi lending protocols' },
  { value: 'GOVERNANCE', label: 'Governance', description: 'DAO governance agents' },
  { value: 'ORACLE', label: 'Oracle', description: 'Data oracle providers' },
  { value: 'CUSTOM', label: 'Custom', description: 'Other autonomous agents' },
];

/**
 * Agent Registration Page
 * Allows users to register new autonomous agents on Enigma
 */
export default function RegisterPage() {
  const router = useRouter();
  const { isConnected, address: walletAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { mutate: registerAgent, isPending, isError, error } = useRegisterAgent();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: '',
      name: '',
      type: undefined,
      description: '',
    },
  });

  const selectedType = watch('type');

  const onSubmit = async (data: FormData) => {
    if (!walletAddress) return;

    try {
      setIsSigning(true);
      const agentAddress = data.address.toLowerCase() as `0x${string}`;
      const message = `Register agent ${agentAddress} on Enigma`;
      const signature = await signMessageAsync({ message });

      registerAgent(
        {
          ...data,
          address: agentAddress,
          signature,
          ownerAddress: walletAddress.toLowerCase() as `0x${string}`,
        },
        {
          onSuccess: (result) => {
            setShowSuccess(true);
            setTimeout(() => {
              router.push(`/agents/${result?.agent.address}`);
            }, 2000);
          },
        }
      );
    } catch {
      // User rejected signature
    } finally {
      setIsSigning(false);
    }
  };

  // Success state
  if (showSuccess) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Agent Registered Successfully!
          </h1>
          <p className="text-[rgba(255,255,255,0.6)]">
            Redirecting to your agent profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-3">
            Register Your Agent
          </h1>
          <p className="text-[rgba(255,255,255,0.6)] max-w-md mx-auto">
            Add your autonomous agent to Enigma for trust scoring and discovery
            by the community.
          </p>
        </div>

        {/* Connect Wallet Prompt */}
        {!isConnected && (
          <div className="mb-8 p-6 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-5 w-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white mb-1">
                  Connect Your Wallet
                </h3>
                <p className="text-sm text-[rgba(255,255,255,0.6)] mb-4">
                  You need to connect your wallet to register an agent. This
                  verifies your ownership.
                </p>
                <WalletConnectButton />
              </div>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Agent Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-white">
              Agent Contract Address <span className="text-red-400">*</span>
            </Label>
            <Input
              id="address"
              placeholder="0x..."
              {...register('address')}
              className={cn(
                'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)]',
                errors.address && 'border-red-500/50'
              )}
              disabled={!isConnected || isPending}
            />
            {errors.address && (
              <p className="text-sm text-red-400">{errors.address.message}</p>
            )}
          </div>

          {/* Agent Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">
              Agent Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="name"
              placeholder="My Trading Bot"
              {...register('name')}
              className={cn(
                'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)]',
                errors.name && 'border-red-500/50'
              )}
              disabled={!isConnected || isPending}
            />
            {errors.name && (
              <p className="text-sm text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* Agent Type */}
          <div className="space-y-2">
            <Label className="text-white">
              Agent Type <span className="text-red-400">*</span>
            </Label>
            <Select
              value={selectedType}
              onValueChange={(value) => setValue('type', value as FormData['type'])}
              disabled={!isConnected || isPending}
            >
              <SelectTrigger
                className={cn(
                  'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)]',
                  errors.type && 'border-red-500/50'
                )}
              >
                <SelectValue placeholder="Select agent type" />
              </SelectTrigger>
              <SelectContent>
                {AGENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-[rgba(255,255,255,0.5)]">
                        {type.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-400">{errors.type.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">
              Description <span className="text-[rgba(255,255,255,0.5)]">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe what your agent does..."
              rows={4}
              {...register('description')}
              className={cn(
                'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] resize-none',
                errors.description && 'border-red-500/50'
              )}
              disabled={!isConnected || isPending}
            />
            {errors.description && (
              <p className="text-sm text-red-400">{errors.description.message}</p>
            )}
          </div>

          {/* Error Message */}
          {isError && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-400">Registration Failed</p>
                <p className="text-sm text-red-400/80">
                  {error?.message || 'Something went wrong. Please try again.'}
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!isConnected || isPending || isSigning}
          >
            {isSigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sign with wallet...
              </>
            ) : isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering Agent...
              </>
            ) : (
              'Register Agent'
            )}
          </Button>

          {/* Help Text */}
          <p className="text-center text-sm text-[rgba(255,255,255,0.5)]">
            By registering, your agent will be verified and receive a trust
            score based on on-chain activity.
          </p>
        </form>
      </div>
    </div>
  );
}
