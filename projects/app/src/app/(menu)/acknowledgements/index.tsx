import { billOfMaterialsQuery } from "@/client/query";
import { useQuery } from "@tanstack/react-query";
import { Fragment } from "react";
import { Text, View } from "react-native";

export default function AcknowledgementsPage() {
  const billOfMaterials = useQuery(billOfMaterialsQuery());

  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="pyly-body-title">Acknowledgements</Text>
      </View>

      <View>
        <Text className="pyly-body">
          These open-source libraries are used to create Pinyinly:
        </Text>
      </View>

      <View className="gap-0.5">
        {billOfMaterials.data?.map(([license, pkgNames]) => (
          <Fragment key={license}>
            <Text className="pyly-body mt-3">{license} License</Text>
            {pkgNames.map((pkgName, index) => (
              <Text key={index} className="pyly-body-caption">
                {pkgName}
              </Text>
            ))}
          </Fragment>
        ))}
      </View>
    </View>
  );
}
