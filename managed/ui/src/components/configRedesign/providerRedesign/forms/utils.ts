/*
 * Copyright 2023 YugaByte, Inc. and Contributors
 * Licensed under the Polyform Free Trial License 1.0.0 (the "License")
 * You may not use this file except in compliance with the License. You may obtain a copy of the License at
 * http://github.com/YugaByte/yugabyte-db/blob/master/licenses/POLYFORM-FREE-TRIAL-LICENSE-1.0.0.txt
 */
import { AxiosError } from 'axios';
import { FieldValues, FormState } from 'react-hook-form';

import { YBPError, YBPStructuredError } from '../../../../redesign/helpers/dtos';
import { isYBPBeanValidationError, isYBPError } from '../../../../utils/errorHandlingUtils';
import { KeyPairManagement, ProviderStatus } from '../constants';
import { AccessKey, YBProvider } from '../types';

export const readFileAsText = (sshKeyFile: File) => {
  const reader = new FileReader();
  return new Promise<string | null>((resolve, reject) => {
    reader.onerror = () => {
      reject(new Error('Error reading file.'));
    };
    reader.onabort = () => {
      reject(new Error('Aborted file reading.'));
    };
    reader.onload = () => {
      resolve(reader.result as string | null);
    };
    reader.readAsText(sshKeyFile);
  });
};

type FieldItem = { fieldId: string };
export const addItem = <TFieldItem extends FieldItem>(
  currentItem: TFieldItem,
  items: TFieldItem[],
  setItems: (items: TFieldItem[]) => void
) => {
  const itemsCopy = Array.from(items);
  itemsCopy.push(currentItem);
  setItems(itemsCopy);
};
export const editItem = <TFieldItem extends FieldItem>(
  currentItem: TFieldItem,
  items: TFieldItem[],
  setItems: (items: TFieldItem[]) => void
) => {
  const itemsCopy = Array.from(items);
  const currentItemIndex = itemsCopy.findIndex((region) => region.fieldId === currentItem.fieldId);
  if (currentItemIndex !== -1) {
    itemsCopy[currentItemIndex] = currentItem;
    setItems(itemsCopy);
  }
};
export const deleteItem = <TFieldItem extends FieldItem>(
  currentItem: TFieldItem,
  items: TFieldItem[],
  setItems: (items: TFieldItem[]) => void
) => {
  const itemsCopy = Array.from(items);
  const currentItemIndex = itemsCopy.findIndex((item) => item.fieldId === currentItem.fieldId);
  if (currentItemIndex !== -1) {
    itemsCopy.splice(currentItemIndex, 1);
    setItems(itemsCopy);
  }
};

export const getMutateProviderErrorMessage = (
  error: AxiosError<YBPStructuredError | YBPError>,
  errorLabel = 'Mutate provider request failed'
) => {
  if (isYBPError(error)) {
    const errorMessageDetails = error.response?.data.error;
    return `${errorLabel}${errorMessageDetails ? `: ${errorMessageDetails}` : '.'}`;
  }
  if (isYBPBeanValidationError(error)) {
    return `${errorLabel}: Form validation failed.`;
  }
  const errorMessageDetails =
    (error as AxiosError<YBPStructuredError>).response?.data.error?.['message'] ?? error.message;
  return `${errorLabel}${errorMessageDetails ? `: ${errorMessageDetails}` : '.'}`;
};

export const getCreateProviderErrorMessage = (error: AxiosError<YBPStructuredError | YBPError>) =>
  getMutateProviderErrorMessage(error, 'Create provider request failed');

export const getEditProviderErrorMessage = (error: AxiosError<YBPStructuredError | YBPError>) =>
  getMutateProviderErrorMessage(error, 'Edit provider request failed');

export const generateLowerCaseAlphanumericId = (stringLength = 14) =>
  Array.from(Array(stringLength), () => Math.floor(Math.random() * 36).toString(36)).join('');

/**
 * Constructs the access keys portion of the create/edit provider payload.
 *
 * If no changes are requested, then return the currentAccessKeys.
 * If user provides a new access key, then send the user provided access key.
 * If user opts to let YBA manage the access keys, then omit `allAccessKeys` from the payload.
 */
export const constructAccessKeysPayload = (
  editSSHKeypair: boolean,
  sshKeypairManagement: KeyPairManagement,
  newAccessKey: { sshKeypairName: string; sshPrivateKeyContent: string },
  currentAccessKeys?: AccessKey[]
) => {
  if (editSSHKeypair && sshKeypairManagement === KeyPairManagement.YBA_MANAGED) {
    return {};
  }

  return {
    allAccessKeys: editSSHKeypair
      ? [
          {
            keyInfo: {
              ...(newAccessKey.sshKeypairName && { keyPairName: newAccessKey.sshKeypairName }),
              ...(newAccessKey.sshPrivateKeyContent && {
                sshPrivateKeyContent: newAccessKey.sshPrivateKeyContent
              })
            }
          }
        ]
      : currentAccessKeys
  };
};

export const getIsFormDisabled = <TFieldValues extends FieldValues>(
  providerConfig: YBProvider,
  isProviderInUse: boolean,
  formState: FormState<TFieldValues>
) =>
  providerConfig.usabilityState === ProviderStatus.UPDATING ||
  isProviderInUse ||
  formState.isValidating ||
  formState.isSubmitting;
