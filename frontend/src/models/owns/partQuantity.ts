import { Audit } from './audit';
import Part, { PartMiniDTO } from './part';

export type PartReservationStatus = 'RESERVED' | 'CONSUMED' | 'RELEASED';

export default interface PartQuantity extends Audit {
  id: number;
  quantity: number;
  part: Part;
  reservationStatus?: PartReservationStatus;
}

export interface PartQuantityMiniDTO {
  id: number;
  quantity: number;
  part: PartMiniDTO;
  reservationStatus?: PartReservationStatus;
}
