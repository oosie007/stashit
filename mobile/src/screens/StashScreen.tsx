import React, { useEffect, useState } from 'react'
import { View, FlatList, Share, Text } from 'react-native'
import { supabase } from '../lib/supabase'

export function StashScreen() {
  const [items, setItems] = useState([])

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('stashed_items')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setItems(data)
  }

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: 'Check out this item I found!',
        url: 'https://your-app.com/item/123'
      })
    } catch (error) {
      Alert.alert(error.message)
    }
  }

  return (
    <View>
      <FlatList
        data={items}
        renderItem={({ item }) => (
          <View>
            <Text>{item.title}</Text>
            <Text>{item.content}</Text>
          </View>
        )}
      />
    </View>
  )
} 