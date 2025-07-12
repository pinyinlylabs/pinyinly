import { useLocalQuery } from "@/client/hooks/useLocalQuery";
import { loadBillOfMaterials } from "@/data/bom";
import { Fragment } from "react";
import { Text, View } from "react-native";

export default function AcknowledgementsPage() {
  const billOfMaterials = useLocalQuery({
    queryKey: [AcknowledgementsPage.name, `billOfMaterials`],
    queryFn: () => loadBillOfMaterials().then((x) => [...x.entries()]),
  });

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
