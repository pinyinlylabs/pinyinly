import type { LocationSpec } from "#data/model.ts";
import type { LocationSpecWithDetail } from "#util/prompts/location.ts";

export interface AssertAssignable<SubType extends SuperType, SuperType> {
  readonly __value?: SubType;
}

export type LocationSpecWithDetailIsAssignableToLocationSpec = AssertAssignable<
  LocationSpecWithDetail,
  LocationSpec
>;
