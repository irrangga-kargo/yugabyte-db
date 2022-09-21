// tslint:disable
/**
 * Yugabyte Cloud
 * YugabyteDB as a Service
 *
 * The version of the OpenAPI document: v1
 * Contact: support@yugabyte.com
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


// eslint-disable-next-line no-duplicate-imports
import type { NetworkDataResponse } from './NetworkDataResponse';
// eslint-disable-next-line no-duplicate-imports
import type { PagingMetadata } from './PagingMetadata';


/**
 * 
 * @export
 * @interface NetworkListResponse
 */
export interface NetworkListResponse  {
  /**
   * 
   * @type {NetworkDataResponse[]}
   * @memberof NetworkListResponse
   */
  data: NetworkDataResponse[];
  /**
   * 
   * @type {PagingMetadata}
   * @memberof NetworkListResponse
   */
  _metadata: PagingMetadata;
}


