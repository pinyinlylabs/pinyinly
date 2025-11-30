import { billOfMaterialsQuery, fontBillOfMaterialsQuery } from "@/client/query";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { Pressable, Text, View } from "react-native";

export default function AcknowledgementsPage() {
  const billOfMaterials = useQuery(billOfMaterialsQuery());
  const fontBillOfMaterials = useQuery(fontBillOfMaterialsQuery());
  const [expandedFont, setExpandedFont] = useState<string | null>(null);

  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="pyly-body-title">Acknowledgements</Text>
      </View>

      {/* Fonts Section */}
      <View>
        <Text className="pyly-body">Fonts used in Pinyinly:</Text>
      </View>

      <View className="gap-2">
        {fontBillOfMaterials.data?.map((font) => (
          <View key={font.name}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${font.name} font license${expandedFont === font.name ? `, expanded` : ``}`}
              onPress={() => {
                setExpandedFont(expandedFont === font.name ? null : font.name);
              }}
            >
              <Text className="pyly-body">{font.name}</Text>
            </Pressable>
            {expandedFont === font.name && (
              <Text className="pyly-body-caption mt-1">{font.license}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Libraries Section */}
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
