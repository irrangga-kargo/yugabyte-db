import React, { FC } from 'react';
import { YBModal } from '../../common/forms/fields';

import { YBTable } from '../XClusterTypes';
import { TableLagGraph } from './TableLagGraph';

import styles from './ReplicationLagGraphModal.module.scss';

interface Props {
  tableDetails: YBTable;
  replicationUUID: string;
  queryEnabled: boolean;
  universeUUID: string;
  nodePrefix: string;
  visible: boolean;
  onHide: () => void;
}

// TODO: rename to TableLagGraphModal
export const ReplicationLagGraphModal: FC<Props> = ({
  tableDetails,
  replicationUUID,
  universeUUID,
  queryEnabled,
  nodePrefix,
  visible,
  onHide
}) => {
  return (
    <YBModal
      title={`Table Replication Lag`}
      dialogClassName={styles.modelDialog}
      visible={visible}
      onHide={onHide}
    >
      <p>
        {'Table: '}
        <b>{tableDetails.tableName}</b>
      </p>
      {tableDetails.pgSchemaName && (
        <p>
          {'Schema: '}
          <b>{tableDetails.pgSchemaName}</b>
        </p>
      )}
      <p>
        {'Keyspace: '}
        <b>{tableDetails.keySpace}</b>
      </p>
      <TableLagGraph
        tableDetails={tableDetails}
        replicationUUID={replicationUUID}
        universeUUID={universeUUID}
        nodePrefix={nodePrefix}
        queryEnabled={queryEnabled}
      />
    </YBModal>
  );
};