import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Input,
  ModalBody,
  ModalHeader,
  SimpleGrid
} from '@chakra-ui/react'
import { Event } from '@shapeshiftoss/hdwallet-core'
import { useEffect, useRef, useState } from 'react'
import { CircleIcon } from 'components/Icons/Circle'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import {
  FailureType,
  MessageType,
  PinMatrixRequestType
} from 'context/WalletProvider/KeepKey/KeepKeyTypes'
import { useWallet } from 'hooks/useWallet/useWallet'

export const KeepKeyPin = () => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { state, dispatch } = useWallet()
  const wallet = state.keyring.get(state.deviceId)

  const pinFieldRef = useRef<HTMLInputElement | null>(null)

  const handlePinPress = (value: number) => {
    if (pinFieldRef?.current) {
      pinFieldRef.current.value += value.toString()
    }
  }

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    const pin = pinFieldRef.current?.value
    if (pin && pin.length > 0) {
      try {
        // The event handler will pick up the response to the sendPin request
        await wallet?.sendPin(pin)
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e) {
        console.error('KeepKey PIN Submit error: ', e)
      }
    }
    setLoading(false)
  }

  // Use different translation text based on which type of PIN request we received
  let translationType: 'pin' | 'newPin' | 'newPinConfirm'
  switch (state.keepKeyPinRequestType) {
    case PinMatrixRequestType.NEWFIRST:
      translationType = 'newPin'
      break
    case PinMatrixRequestType.NEWSECOND:
      translationType = 'newPinConfirm'
      break
    default:
      translationType = 'pin'
  }

  const pinNumbers = [7, 8, 9, 4, 5, 6, 1, 2, 3]

  useEffect(() => {
    /**
     * Handle errors reported by the KeepKey
     * Specifically look for PIN errors that are relevant to this modal
     */
    const handleError = (e: Event) => {
      if (e.message_enum === MessageType.FAILURE) {
        switch (e.message?.code as FailureType) {
          // Device has a programmed PIN
          case FailureType.PININVALID:
            setError(`walletProvider.keepKey.errors.pinInvalid`)
            break
          // A "cancel" command was sent while showing the PIN screen on the KK
          case FailureType.PINCANCELLED:
            setError(`walletProvider.keepKey.errors.pinCancelled`)
            break
          // Creating a NEW PIN, the user didn't enter the same PIN in steps 1 and 2
          case FailureType.PINMISMATCH:
            setError(`walletProvider.keepKey.errors.pinMismatch`)
            break
          default:
            setError('walletProvider.keepKey.errors.unknown')
        }
      }
    }

    state.keyring.on(['KeepKey', state.deviceId, String(MessageType.FAILURE)], handleError)

    return () => {
      state.keyring.off(['KeepKey', state.deviceId, String(MessageType.FAILURE)], handleError)
    }
  }, [state.deviceId, state.keyring])

  return (
    <>
      <ModalHeader>
        <Text translation={`walletProvider.keepKey.${translationType}.header`} />
      </ModalHeader>
      <ModalBody>
        <Text color='gray.500' translation={`walletProvider.keepKey.${translationType}.body`} />
        <SimpleGrid columns={3} spacing={6} my={6} maxWidth='250px' ml='auto' mr='auto'>
          {pinNumbers.map(number => (
            <Button key={number} size='lg' p={8} onClick={() => handlePinPress(number)}>
              <CircleIcon boxSize={4} />
            </Button>
          ))}
        </SimpleGrid>
        <Input
          type='password'
          ref={pinFieldRef}
          size='lg'
          variant='filled'
          mb={6}
          autoComplete='one-time-code'
        />
        {error && (
          <Alert status='error'>
            <AlertIcon />
            <AlertDescription>
              <Text translation={error} />
            </AlertDescription>
          </Alert>
        )}
        <Button isFullWidth size='lg' colorScheme='blue' onClick={handleSubmit} disabled={loading}>
          <Text translation={`walletProvider.keepKey.${translationType}.button`} />
        </Button>
      </ModalBody>
    </>
  )
}
